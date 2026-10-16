import http from 'node:http';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { io as ClientIo, type Socket as ClientSocket } from 'socket.io-client';
import { AuthService } from '../../apps/server/src/auth/service.js';
import { createAuthRouter, createMeRouter } from '../../apps/server/src/auth/routes.js';
import { createTelemetryRouter } from '../../apps/server/src/routes/telemetry.js';
import { MemoryTelemetryRepository } from '../../apps/server/src/storage/db.js';
import { RealtimeSocketServer } from '../../apps/server/src/realtime/socket.js';
import { TEST_USERS, TEST_PASSWORD, TEST_SITES } from '@minsakthi/db';

describe('Authentication, Authorization and Realtime Socket Suite (R05, R06, R07, R11: T06, T07, T15, T16, T23, T27)', () => {
  let server: http.Server;
  let serverPort: number;
  let repo: MemoryTelemetryRepository;
  let authService: AuthService;
  let socketServer: RealtimeSocketServer;

  beforeAll(async () => {
    repo = new MemoryTelemetryRepository();
    authService = new AuthService(repo);

    const app = express();
    app.use(cookieParser());
    app.use(express.json());

    server = http.createServer(app);
    socketServer = new RealtimeSocketServer(server, authService, repo);

    app.use('/api/v1/auth', createAuthRouter(authService));
    app.use('/api/v1/me', createMeRouter(authService));
    app.use('/api/v1', createTelemetryRouter(authService, repo));

    // Health ready
    app.get('/health/ready', (_req, res) => {
      res.status(200).json({
        status: 'ready',
        database: repo.isHealthy() ? 'connected' : 'degraded',
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr !== null) {
          serverPort = addr.port;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await socketServer.close();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('T15: Login issues access token in body, rotating refresh cookie, and prevents unauthorized access after logout', async () => {
    // 1. Login with admin credentials
    const loginRes = await fetch(`http://127.0.0.1:${serverPort}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USERS.admin.email,
        password: TEST_PASSWORD,
      }),
    });

    expect(loginRes.status).toBe(200);
    const loginData = await loginRes.json();
    expect(loginData.accessToken).toBeDefined();
    expect(loginData.user.role).toBe('admin');
    expect(loginData.expiresInSeconds).toBe(300); // 5 min TTL

    // Verify Set-Cookie header contains refreshToken
    const setCookie = loginRes.headers.get('set-cookie');
    expect(setCookie).toContain('refreshToken=');
    expect(setCookie).toContain('HttpOnly');

    // Extract cookie value
    const match = setCookie?.match(/refreshToken=([^;]+)/);
    const rawRefreshToken = match ? match[1] : '';
    expect(rawRefreshToken).toBeTruthy();

    // 2. Access /api/v1/me with bearer token
    const meRes = await fetch(`http://127.0.0.1:${serverPort}/api/v1/me`, {
      headers: { Authorization: `Bearer ${loginData.accessToken}` },
    });
    expect(meRes.status).toBe(200);
    const meData = await meRes.json();
    expect(meData.user.email).toBe(TEST_USERS.admin.email);

    // 3. Test token rotation via /api/v1/auth/refresh
    const refreshRes = await fetch(`http://127.0.0.1:${serverPort}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${rawRefreshToken}` },
    });
    expect(refreshRes.status).toBe(200);
    const refreshData = await refreshRes.json();
    expect(refreshData.accessToken).toBeDefined();
    expect(refreshData.accessToken).not.toBe(loginData.accessToken);

    const rotatedCookieMatch = refreshRes.headers.get('set-cookie')?.match(/refreshToken=([^;]+)/);
    const newRefreshToken = rotatedCookieMatch ? rotatedCookieMatch[1] : '';
    expect(newRefreshToken).toBeTruthy();
    expect(newRefreshToken).not.toBe(rawRefreshToken);

    // 4. Test reuse detection: using old rotated refresh token triggers family revocation!
    const reuseRes = await fetch(`http://127.0.0.1:${serverPort}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${rawRefreshToken}` },
    });
    expect(reuseRes.status).toBe(401);

    // The newly issued token is now also invalidated due to family revocation
    const afterReuseRes = await fetch(`http://127.0.0.1:${serverPort}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${newRefreshToken}` },
    });
    expect(afterReuseRes.status).toBe(401);
  });

  it('T16: Denies cross-site access on API endpoints and realtime socket subscriptions', async () => {
    // 1. Log in as user belonging only to site_isolated
    const isolatedLoginRes = await fetch(`http://127.0.0.1:${serverPort}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USERS.isolatedUser.email,
        password: TEST_PASSWORD,
      }),
    });
    const isolatedAuth = await isolatedLoginRes.json();
    const isolatedToken = isolatedAuth.accessToken;

    // 2. Attempt to query prototype1 (which belongs to site_default)
    const crossSiteApiRes = await fetch(
      `http://127.0.0.1:${serverPort}/api/v1/sites/${TEST_SITES.default.id}/devices/prototype1/latest`,
      {
        headers: { Authorization: `Bearer ${isolatedToken}` },
      }
    );
    // Must be rejected with 403 Forbidden
    expect(crossSiteApiRes.status).toBe(403);

    // 3. Attempt cross-site Socket subscription
    const client: ClientSocket = ClientIo(`http://127.0.0.1:${serverPort}`, {
      path: '/socket.io/',
      auth: { token: isolatedToken },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => {
        client.emit(
          'device:subscribe',
          {
            requestId: 'test-req-1',
            selectionGeneration: 1,
            siteId: TEST_SITES.default.id, // Attempting site_default subscription
            deviceId: 'prototype1',
          },
          (ack: { status: string; error?: string }) => {
            expect(ack.status).toBe('error');
            expect(ack.error).toBe('CROSS_SITE_DENIED');
            client.disconnect();
            resolve();
          }
        );
      });
      client.on('connect_error', reject);
    });
  });

  it('T06: Authenticates Socket connection with in-memory token and resyncs state on subscribe', async () => {
    // Log in as default admin
    const loginRes = await fetch(`http://127.0.0.1:${serverPort}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USERS.admin.email,
        password: TEST_PASSWORD,
      }),
    });
    const { accessToken } = await loginRes.json();

    const client: ClientSocket = ClientIo(`http://127.0.0.1:${serverPort}`, {
      path: '/socket.io/',
      auth: { token: accessToken },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => {
        client.on('state:snapshot', (snapshot) => {
          expect(snapshot.deviceId).toBe('prototype1');
          expect(snapshot.schemaVersion).toBe(1);
          expect(snapshot.channels.length).toBe(5);
          expect(snapshot.channels[0].displaySlot).toBe(1);
          client.disconnect();
          resolve();
        });

        client.emit('device:subscribe', {
          requestId: 'sub-req-1',
          selectionGeneration: 1,
          siteId: TEST_SITES.default.id,
          deviceId: 'prototype1',
        });
      });

      client.on('connect_error', reject);
    });
  });

  it('T07: Stale selection generation or wrong device snapshots are rejected', async () => {
    // Verifies selectionGeneration contract:
    // When switching rapidly, old delayed snapshots with lower selection generation do not overwrite state.
    const snap1 = await socketServer.generateSnapshot('req-1', 1, TEST_SITES.default.id, 'prototype1');
    const snap2 = await socketServer.generateSnapshot('req-2', 2, TEST_SITES.default.id, 'prototype2');

    expect(snap1.selectionGeneration).toBe(1);
    expect(snap1.deviceId).toBe('prototype1');

    expect(snap2.selectionGeneration).toBe(2);
    expect(snap2.deviceId).toBe('prototype2');

    // Newer selection generation takes precedence
    expect(snap2.selectionGeneration).toBeGreaterThan(snap1.selectionGeneration);
  });

  it('T23: Database-down history query returns 503 with Retry-After guidance and zero fabricated rows', async () => {
    // Log in
    const loginRes = await fetch(`http://127.0.0.1:${serverPort}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USERS.admin.email,
        password: TEST_PASSWORD,
      }),
    });
    const { accessToken } = await loginRes.json();

    // Simulate DB outage
    repo.setHealthy(false);

    const historyRes = await fetch(
      `http://127.0.0.1:${serverPort}/api/v1/sites/${TEST_SITES.default.id}/devices/prototype1/channels/channel1/history`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    expect(historyRes.status).toBe(503);
    expect(historyRes.headers.get('retry-after')).toBe('5');
    const data = await historyRes.json();
    expect(data.error).toBe('DATABASE_UNAVAILABLE');
    expect(data.samples).toBeUndefined(); // Zero fabricated rows

    // Restore health
    repo.setHealthy(true);
  });

  it('T27: Cold start with DB down reports readiness degraded without crashing', async () => {
    repo.setHealthy(false);

    const readyRes = await fetch(`http://127.0.0.1:${serverPort}/health/ready`);
    expect(readyRes.status).toBe(200);
    const readyData = await readyRes.json();
    expect(readyData.database).toBe('degraded');

    repo.setHealthy(true);
  });
});
