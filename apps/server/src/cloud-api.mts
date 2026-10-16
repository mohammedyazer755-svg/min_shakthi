import http from 'node:http';
import express from 'express';
import cookieParser from 'cookie-parser';
import { AuthService } from './auth/service.js';
import { createAuthRouter, createMeRouter } from './auth/routes.js';
import { createTelemetryRouter } from './routes/telemetry.js';
import { createReportsRouter } from './routes/reports.js';
import { createAlertsRouter } from './routes/alerts.js';
import { createDevicesRouter } from './routes/devices.js';
import { createUsersRouter } from './routes/users.js';
import { getTelemetryRepository } from './storage/db.js';
import { PostgresTelemetryRepository } from './storage/postgres.js';
import { RealtimeSocketServer } from './realtime/socket.js';

// HTTP handlers run independently of the continuously running MQTT daemon.
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
const repo = getTelemetryRepository();
const auth = new AuthService(repo);
app.use(cookieParser());
app.use(express.json({ limit: '16kb' }));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  // Cookie endpoints accept same-origin requests; bearer-auth APIs remain usable by devices/tools.
  const origin = req.headers.origin;
  if (origin && req.method !== 'GET' && new URL(origin).host !== req.headers.host) {
    res.status(403).json({ error: 'ORIGIN_DENIED' });
    return;
  }
  next();
});
app.get('/health/live', (_req, res) => { res.json({ status: 'live' }); });
app.get('/health/ready', async (_req, res) => {
  try {
    if (!(repo instanceof PostgresTelemetryRepository)) throw new Error('DATABASE_UNAVAILABLE');
    await repo.ping();
    const worker = await repo.getWorkerStatus();
    const active = !!worker && Date.now() - new Date(worker.at).getTime() < 15000;
    res.json({ status:'ready',database:'connected',broker:{ connected:active && worker!.connected,subscribed:active && worker!.subscribed },worker:active?'running':'unavailable' });
  } catch { res.status(503).json({ status:'degraded',database:'unavailable' }); }
});
app.use('/api/v1/auth', createAuthRouter(auth));
app.use('/api/v1/me', createMeRouter(auth));
app.use('/api/v1/users', createUsersRouter(auth,repo));
app.use('/api/v1', createTelemetryRouter(auth,repo));
app.use('/api/v1', createReportsRouter(auth,repo));
app.use('/api/v1', createAlertsRouter(auth,repo));
app.use('/api/v1', createDevicesRouter(auth,repo));
app.use((_req, res) => { res.status(404).json({ error:'NOT_FOUND' }); });

const server = http.createServer(app);
new RealtimeSocketServer(server,auth,repo,undefined,
  [...(process.env['ALLOWED_ORIGINS'] ?? 'https://min-shakthi.vercel.app').split(','),
    ...(process.env['VERCEL_URL'] ? [`https://${process.env['VERCEL_URL']}`] : [])]);

// Export the HTTP server so Vercel can handle Socket.IO WebSocket upgrades.
export default server;
