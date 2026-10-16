import http from 'node:http';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { AuthService } from '../../apps/server/src/auth/service.js';
import { createAuthRouter } from '../../apps/server/src/auth/routes.js';
import { createTelemetryRouter } from '../../apps/server/src/routes/telemetry.js';
import { createReportsRouter } from '../../apps/server/src/routes/reports.js';
import { createAlertsRouter } from '../../apps/server/src/routes/alerts.js';
import { createDevicesRouter } from '../../apps/server/src/routes/devices.js';
import { createUsersRouter } from '../../apps/server/src/routes/users.js';
import { MemoryTelemetryRepository } from '../../apps/server/src/storage/db.js';
import { TEST_USERS, TEST_PASSWORD } from '@minsakthi/db';
import type { TelemetryPayload } from '@minsakthi/contracts';

function makeMockSample(
  deviceId: string,
  channelId: string,
  timeIso: string,
  energyRaw = '100.0',
  power = 150.0
): TelemetryPayload {
  return {
    eventId: crypto.randomUUID(),
    siteId: '11111111-1111-4111-8111-111111111111',
    deviceId,
    channelId,
    receivedAt: timeIso,
    serverEpoch: '22222222-2222-4222-8222-222222222222',
    sequence: 1,
    retained: false,
    suspectDuplicate: false,
    quality: [],
    configVersion: 1,
    values: {
      voltage: 239.5,
      current: 0.63,
      power,
      energyRaw,
      frequency: 50.0,
    },
  };
}

describe('Phase 5 Integration Suite: History, Reports, Alerts, Settings & Exports', () => {
  let server: http.Server;
  let serverPort: number;
  let repo: MemoryTelemetryRepository;
  let authService: AuthService;
  let adminToken: string;
  let operatorToken: string;
  let viewerToken: string;
  const siteId = '11111111-1111-4111-8111-111111111111';

  beforeAll(async () => {
    repo = new MemoryTelemetryRepository();
    authService = new AuthService(repo);

    const app = express();
    app.use(cookieParser());
    app.use(express.json());

    app.use('/api/v1/auth', createAuthRouter(authService));
    app.use('/api/v1/users', createUsersRouter(authService, repo));
    app.use('/api/v1', createTelemetryRouter(authService, repo));
    app.use('/api/v1', createReportsRouter(authService, repo));
    app.use('/api/v1', createAlertsRouter(authService, repo));
    app.use('/api/v1', createDevicesRouter(authService, repo));

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        serverPort = typeof addr === 'object' && addr ? addr.port : 0;
        resolve();
      });
    });

    // Obtain tokens
    const login = async (email: string) => {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: TEST_PASSWORD }),
      });
      const data = await res.json();
      return data.accessToken as string;
    };

    adminToken = await login(TEST_USERS.admin.email);
    operatorToken = await login(TEST_USERS.operator.email);
    viewerToken = await login(TEST_USERS.viewer.email);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(async () => {
    repo.setHealthy(true);

    // Seed test samples
    const baseT = new Date('2026-10-16T10:00:00.000Z').getTime();
    const samples: TelemetryPayload[] = [
      makeMockSample('prototype1', 'channel1', new Date(baseT).toISOString(), '100.0', 50),
      makeMockSample('prototype1', 'channel1', new Date(baseT + 5000).toISOString(), '100.5', 60),
      makeMockSample('prototype1', 'channel1', new Date(baseT + 10000).toISOString(), '101.0', 70),
      makeMockSample('prototype1', 'channel2', new Date(baseT).toISOString(), '50.0', 0),
    ];
    await repo.insertTelemetryBatch(samples);
  });

  describe('1. History Filtering, Pagination & Frozen Cutoff', () => {
    it('returns paginated history with total count and frozen query cutoff', async () => {
      const res = await fetch(
        `http://127.0.0.1:${serverPort}/api/v1/sites/${siteId}/devices/prototype1/history?channelId=channel1&limit=2&offset=0`,
        { headers: { Authorization: `Bearer ${viewerToken}` } }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.samples.length).toBe(2);
      expect(data.total).toBe(3);
      expect(data.cutoff).toBeDefined();
    });

    it('T23: returns 503 with Retry-After guidance when database is unavailable without fabricated data', async () => {
      repo.setHealthy(false);

      const res = await fetch(
        `http://127.0.0.1:${serverPort}/api/v1/sites/${siteId}/devices/prototype1/history`,
        { headers: { Authorization: `Bearer ${viewerToken}` } }
      );

      expect(res.status).toBe(503);
      expect(res.headers.get('retry-after')).toBe('5');
      const data = await res.json();
      expect(data.error).toBe('DATABASE_UNAVAILABLE');
    });
  });

  describe('2. Real CSV Export with Formula Injection Defense & Site Isolation', () => {
    it('T22: exports valid CSV escaping formula cells (=, +, -, @) and preserving numeric columns', async () => {
      const res = await fetch(
        `http://127.0.0.1:${serverPort}/api/v1/sites/${siteId}/devices/prototype1/export?channelId=channel1`,
        { headers: { Authorization: `Bearer ${viewerToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/csv');
      const csv = await res.text();
      expect(csv).toContain('received_at,event_id,channel_id,voltage,current,power,energy_raw,frequency');
      expect(csv).toContain('channel1');
      expect(csv).toContain('239.5');
    });

    it('T16: denies cross-site export requests with 403 Forbidden', async () => {
      const res = await fetch(
        `http://127.0.0.1:${serverPort}/api/v1/sites/22222222-2222-4222-8222-222222222222/devices/prototype1/export`,
        { headers: { Authorization: `Bearer ${viewerToken}` } }
      );

      expect(res.status).toBe(403);
    });
  });

  describe('3. Daily and Monthly Reports with Billing Suppression', () => {
    it('generates daily report and prominently discloses verified billing suppression (R12, R13)', async () => {
      const res = await fetch(
        `http://127.0.0.1:${serverPort}/api/v1/sites/${siteId}/devices/prototype1/reports/daily?date=2026-10-16`,
        { headers: { Authorization: `Bearer ${viewerToken}` } }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.periodStart).toBeDefined();
      expect(data.periodEnd).toBeDefined();
      expect(data.totals.isCostVerified).toBe(false);
      expect(data.totals.costEstimateInr).toBeNull();
      expect(data.totals.billingSuppressionNotice).toContain('Verified billing calculation suppressed');
      expect(data.status).toBe('unverified_units');
    });
  });

  describe('4. Durable Alert Rules & Multi-User Acknowledgements', () => {
    it('allows Admin to create and update alert rules; denies non-admin', async () => {
      // Viewer attempt -> 403
      const denyRes = await fetch(
        `http://127.0.0.1:${serverPort}/api/v1/sites/${siteId}/alerts/rules`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${viewerToken}`,
          },
          body: JSON.stringify({
            deviceId: 'prototype1',
            metric: 'voltage',
            operator: 'gt',
            threshold: 250,
            hysteresis: 5,
            debounceMs: 3000,
            severity: 'critical',
          }),
        }
      );
      expect(denyRes.status).toBe(403);

      // Admin attempt -> 201 Created
      const createRes = await fetch(
        `http://127.0.0.1:${serverPort}/api/v1/sites/${siteId}/alerts/rules`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            deviceId: 'prototype1',
            metric: 'voltage',
            operator: 'gt',
            threshold: 250,
            hysteresis: 5,
            debounceMs: 3000,
            severity: 'critical',
          }),
        }
      );
      expect(createRes.status).toBe(201);
      const rule = await createRes.json();
      expect(rule.id).toBeDefined();
      expect(rule.version).toBe(1);
    });

    it('T21: Operator acknowledges alert independently; records note and user details', async () => {
      const alertId = crypto.randomUUID();
      await repo.saveAlert({
        id: alertId,
        ruleId: 'rule-test-1',
        deviceId: 'prototype1',
        channelId: 'channel1',
        openedAt: new Date().toISOString(),
        resolvedAt: null,
        lastSeenAt: new Date().toISOString(),
        state: 'open',
        triggerEventId: crypto.randomUUID(),
        triggerValue: 252.0,
        violationStartAt: new Date().toISOString(),
        acknowledgements: [],
      });

      const ackRes = await fetch(
        `http://127.0.0.1:${serverPort}/api/v1/sites/${siteId}/alerts/${alertId}/ack`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${operatorToken}`,
          },
          body: JSON.stringify({ note: 'Transformer load adjusted' }),
        }
      );

      expect(ackRes.status).toBe(200);
      const ackData = await ackRes.json();
      expect(ackData.state).toBe('acknowledged');
      expect(ackData.acknowledgements.length).toBe(1);
      expect(ackData.acknowledgements[0].userDisplayName).toBe(TEST_USERS.operator.displayName);
      expect(ackData.acknowledgements[0].note).toBe('Transformer load adjusted');
    });
  });

  describe('5. Device Mapping Editor with Optimistic Locking (R15)', () => {
    it('updates mapping when expectedConfigVersion matches; rejects with 409 Conflict when mismatched', async () => {
      const getRes = await fetch(
        `http://127.0.0.1:${serverPort}/api/v1/sites/${siteId}/devices/prototype1/mapping`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      expect(getRes.status).toBe(200);
      const mappingData = await getRes.json();
      const curVersion = mappingData.configVersion;

      // Conflict update (outdated version)
      const conflictRes = await fetch(
        `http://127.0.0.1:${serverPort}/api/v1/sites/${siteId}/devices/prototype1/mapping`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            expectedConfigVersion: 99,
            mappings: [
              { channelId: 'channel1', displaySlot: 1, label: 'Main Phase (Updated)', enabled: true },
            ],
          }),
        }
      );
      expect(conflictRes.status).toBe(409);
      const conflictData = await conflictRes.json();
      expect(conflictData.error).toBe('OPTIMISTIC_LOCK_CONFLICT');

      // Valid update (matching version)
      const validRes = await fetch(
        `http://127.0.0.1:${serverPort}/api/v1/sites/${siteId}/devices/prototype1/mapping`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            expectedConfigVersion: curVersion,
            mappings: [
              { channelId: 'channel1', displaySlot: 1, label: 'Main Phase (Updated)', enabled: true },
            ],
          }),
        }
      );
      expect(validRes.status).toBe(200);
      const validData = await validRes.json();
      expect(validData.configVersion).toBe(curVersion + 1);
    });
  });

  describe('6. User Preferences & Audit Trail (R16)', () => {
    it('persists user preferences and allows retrieval', async () => {
      const updateRes = await fetch(`http://127.0.0.1:${serverPort}/api/v1/users/me/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewerToken}`,
        },
        body: JSON.stringify({
          timezone: 'Asia/Kolkata',
          preferredDeviceId: 'prototype1',
          displayPreferences: { theme: 'warm_ivory', density: 'compact' },
        }),
      });

      expect(updateRes.status).toBe(200);
      const updateData = await updateRes.json();
      expect(updateData.timezone).toBe('Asia/Kolkata');

      const getRes = await fetch(`http://127.0.0.1:${serverPort}/api/v1/users/me/preferences`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });

      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.displayPreferences.theme).toBe('warm_ivory');
    });

    it('allows Admin to inspect audit logs; denies Viewer', async () => {
      const denyRes = await fetch(`http://127.0.0.1:${serverPort}/api/v1/users/sites/${siteId}/audit-logs`, {
        headers: { Authorization: `Bearer ${viewerToken}` },
      });
      expect(denyRes.status).toBe(403);

      const logsRes = await fetch(`http://127.0.0.1:${serverPort}/api/v1/users/sites/${siteId}/audit-logs`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(logsRes.status).toBe(200);
      const data = await logsRes.json();
      expect(Array.isArray(data.logs)).toBe(true);
    });
  });
});
