import express from 'express';
import cors from 'cors';
import { loadAndValidateServerEnv } from './config/env.js';
import { MqttIngestService } from './mqtt/client.js';
import { IngestMetrics } from './observability/metrics.js';

const env = loadAndValidateServerEnv();

const app = express();
const metrics = IngestMetrics.getInstance();
const mqttService = new MqttIngestService(env);

const allowedOrigins = env.ALLOWED_ORIGINS
  ? env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

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
    phase: 'Phase 2 Ingestion',
  });
});

let server: ReturnType<typeof app.listen> | null = null;

if (process.env['NODE_ENV'] !== 'test') {
  mqttService.start().catch((err) => {
    console.error('[MIN-SAKTHI V2] MQTT Service failed to start:', err);
  });

  server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`[MIN-SAKTHI V2] Server initialized on 0.0.0.0:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = async () => {
    console.log('[MIN-SAKTHI V2] Graceful shutdown initiated...');
    await mqttService.stop();
    if (server) {
      server.close(() => {
        console.log('[MIN-SAKTHI V2] Server stopped.');
        process.exit(0);
      });
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export { app, mqttService };
