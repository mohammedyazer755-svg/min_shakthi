import http from 'node:http';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { loadAndValidateServerEnv } from './config/env.js';
import { MqttIngestService } from './mqtt/client.js';
import { IngestMetrics } from './observability/metrics.js';
import { AuthService } from './auth/service.js';
import { createAuthRouter, createMeRouter } from './auth/routes.js';
import { createTelemetryRouter } from './routes/telemetry.js';
import { getTelemetryRepository } from './storage/db.js';
import { DurableSpoolManager } from './storage/spool.js';
import { TelemetryPersisterWorker } from './storage/persister.js';
import { RealtimeSocketServer } from './realtime/socket.js';

const env = loadAndValidateServerEnv();

const app = express();
const httpServer = http.createServer(app);
const metrics = IngestMetrics.getInstance();
const repo = getTelemetryRepository();
const authService = new AuthService(repo);

// Spool & Persister
const spoolDir = process.env['SPOOL_DIR'] || path.resolve(process.cwd(), '.spool');
const spool = new DurableSpoolManager({ spoolDir });
const persister = new TelemetryPersisterWorker(spool, repo);

// Realtime Socket.IO
const allowedOrigins = env.ALLOWED_ORIGINS
  ? env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

const socketServer = new RealtimeSocketServer(
  httpServer,
  authService,
  repo,
  undefined,
  allowedOrigins
);

// MQTT Service wiring
const mqttService = new MqttIngestService(env, {
  spool,
  persister,
  socketServer,
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin "${origin}" rejected by CORS policy.`));
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

// Public health endpoints: minimal status, no secrets, no telemetry
app.get('/health/live', (_req, res) => {
  res.status(200).json({ status: 'live', timestamp: new Date().toISOString() });
});

app.get('/health/ready', (_req, res) => {
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    broker: {
      connected: metrics.brokerConnected,
      subscribed: metrics.brokerSubscribed,
    },
    database: repo.isHealthy() ? 'connected' : 'degraded',
    phase: 'Phase 3 Database, Auth & Realtime Slice',
  });
});

// Auth & API Routes
app.use('/api/v1/auth', createAuthRouter(authService));
app.use('/api/v1/me', createMeRouter(authService));
app.use('/api/v1', createTelemetryRouter(authService, repo));

let isRunning = false;

if (process.env['NODE_ENV'] !== 'test') {
  spool.open();
  // Recover and replay any uncommitted records from spool
  const replayResult = spool.recoverAndReplay(0, async (rec) => {
    persister.onRecordAppended(rec);
  });
  console.log(`[MIN-SAKTHI V2] Spool recovered: ${replayResult.validRecords.length} records found.`);

  persister.start();

  mqttService.start().catch((err) => {
    console.error('[MIN-SAKTHI V2] MQTT Service failed to start:', err);
  });

  httpServer.listen(env.PORT, '0.0.0.0', () => {
    isRunning = true;
    console.log(`[MIN-SAKTHI V2] Server initialized on 0.0.0.0:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = async () => {
    console.log('[MIN-SAKTHI V2] Graceful shutdown initiated...');
    await mqttService.stop();
    persister.stop();
    await persister.forceFlush();
    spool.close();
    await socketServer.close();
    if (isRunning) {
      httpServer.close(() => {
        console.log('[MIN-SAKTHI V2] Server stopped.');
        process.exit(0);
      });
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export {
  app,
  httpServer,
  mqttService,
  authService,
  repo,
  spool,
  persister,
  socketServer,
};
