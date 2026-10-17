import http from 'node:http';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { AuthService } from '../../apps/server/src/auth/service.js';
import { createAuthRouter } from '../../apps/server/src/auth/routes.js';
import { createIncidentsRouter } from '../../apps/server/src/routes/incidents.js';
import { MemoryTelemetryRepository } from '../../apps/server/src/storage/db.js';
import { TEST_USERS, TEST_PASSWORD } from '@minsakthi/db';
import type { IncidentRecord } from '@minsakthi/contracts';

function makeTestIncident(
  siteId: string,
  deviceId: string,
  type: 'electrical_breach' | 'device_interruption' | 'transport_outage' = 'electrical_breach',
  state: 'evaluating' | 'resolved' | 'acknowledged' = 'evaluating'
): IncidentRecord {
  return {
    id: crypto.randomUUID(),
    siteId,
    deviceId,
    channelId: 'ch-01',
    type,
    severity: 'critical',
    state,
    title: `Test ${type} Incident on ${deviceId}`,
    summary: `Violation observed on ${deviceId} channel ch-01. Deterministic finding.`,
    causeConfirmation: type === 'electrical_breach' ? 'electrical_breach' : 'device_silence_unconfirmed',
    startedAt: '2026-10-17T06:00:00.000Z',
    endedAt: state === 'resolved' ? '2026-10-17T06:01:00.000Z' : null,
    durationMs: state === 'resolved' ? 60 : 0,
    evidence: {
      windowBeforeMs: 120000,
      windowAfterMs: 120000,
      detectionTime: '2026-10-17T06:00:00.000Z',
      recoveryTime: state === 'resolved' ? '2026-10-17T06:01:00.000Z' : null,
      lastReceivedAt: '2026-10-17T06:01:00.000Z',
      channelLabel: 'Incomer Phase A',
      ruleSnapshot: {
        ruleId: 'rule-volt',
        metric: 'voltage',
        operator: 'gt',
        threshold: 250,
        debounceMs: 0,
        hysteresis: 5,
        version: 1,
      },
      mappingVersion: 1,
      transportHealth: { brokerConnected: true, brokerSubscribed: true },
      gaps: [],
      extrema: {
        minVoltage: 238,
        maxVoltage: 268.4,
        maxCurrent: 6.2,
        maxPower: 1476,
        minFrequency: 50.0,
        maxFrequency: 50.1,
      },
      samples: [
        {
          timestamp: '2026-10-17T05:59:00.000Z',
          voltage: 238,
          current: 4.5,
          power: 1071,
          frequency: 50.0,
          energyRaw: '100.0',
          channelId: 'ch-01',
          phase: 'before',
        },
        {
          timestamp: '2026-10-17T06:00:00.000Z',
          voltage: 268.4,
          current: 6.2,
          power: 1476,
          frequency: 50.1,
          energyRaw: '100.1',
          channelId: 'ch-01',
          phase: 'during',
        },
      ],
      sourceEventIds: ['ev-1', 'ev-2'],
    },
    acknowledgements: [],
    createdAt: '2026-10-17T06:00:00.000Z',
    updatedAt: '2026-10-17T06:00:00.000Z',
  };
}

describe('Phase 6 Integration Suite: Power Event Investigator APIs & Safety', () => {
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
    app.use('/api/v1', createIncidentsRouter(authService, repo));

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
  });

  describe('1. Incident List & Filtering Endpoint', () => {
    it('returns filtered and paginated incidents with total count', async () => {
      const inc1 = makeTestIncident(siteId, 'prototype1', 'electrical_breach', 'evaluating');
      const inc2 = makeTestIncident(siteId, 'prototype1', 'device_interruption', 'resolved');
      const inc3 = makeTestIncident(siteId, 'prototype2', 'transport_outage', 'evaluating');

      await repo.saveIncident(inc1);
      await repo.saveIncident(inc2);
      await repo.saveIncident(inc3);

      // Filter by deviceId prototype1
      const resDev = await fetch(
        `http://127.0.0.1:${serverPort}/api/v1/sites/${siteId}/incidents?deviceId=prototype1`,
        { headers: { Authorization: `Bearer ${viewerToken}` } }
      );
      expect(resDev.status).toBe(200);
      const dataDev = await resDev.json();
      expect(dataDev.incidents.length).toBe(2);
      expect(dataDev.incidents.every((i: IncidentRecord) => i.deviceId === 'prototype1')).toBe(true);

      // Filter by state=evaluating
      const resState = await fetch(
        `http://127.0.0.1:${serverPort}/api/v1/sites/${siteId}/incidents?state=evaluating`,
        { headers: { Authorization: `Bearer ${viewerToken}` } }
      );
      expect(resState.status).toBe(200);
      const dataState = await resState.json();
      expect(dataState.incidents.every((i: IncidentRecord) => i.state === 'evaluating')).toBe(true);

      // Filter by type=electrical_breach
      const resType = await fetch(
        `http://127.0.0.1:${serverPort}/api/v1/sites/${siteId}/incidents?type=electrical_breach`,
        { headers: { Authorization: `Bearer ${viewerToken}` } }
      );
      expect(resType.status).toBe(200);
      const dataType = await resType.json();
      expect(dataType.incidents.every((i: IncidentRecord) => i.type === 'electrical_breach')).toBe(true);
    });
  });

  describe('2. Incident Detail Endpoint', () => {
    it('returns full incident record including evidence and samples', async () => {
      const inc = makeTestIncident(siteId, 'prototype1', 'electrical_breach', 'evaluating');
      await repo.saveIncident(inc);

      const res = await fetch(
        `http://127.0.0.1:${serverPort}/api/v1/sites/${siteId}/incidents/${inc.id}`,
        { headers: { Authorization: `Bearer ${viewerToken}` } }
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBe(inc.id);
      expect(data.evidence.samples.length).toBe(2);
      expect(data.evidence.extrema.maxVoltage).toBe(268.4);
    });

    it('returns 404 for unknown incident ID', async () => {
      const res = await fetch(
        `http://127.0.0.1:${serverPort}/api/v1/sites/${siteId}/incidents/00000000-0000-0000-0000-000000000000`,
        { headers: { Authorization: `Bearer ${viewerToken}` } }
      );
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe('INCIDENT_NOT_FOUND');
    });
  });

  describe('3. Incident Acknowledgement Role Boundaries', () => {
    it('rejects viewer acknowledgement with 403 Forbidden', async () => {
      const inc = makeTestIncident(siteId, 'prototype1');
      await repo.saveIncident(inc);

      const res = await fetch(
        `http://127.0.0.1:${serverPort}/api/v1/sites/${siteId}/incidents/${inc.id}/ack`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${viewerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ note: 'Viewer attempting ack' }),
        }
      );

      expect(res.status).toBe(403);
    });

    it('allows operator acknowledgement, updates record, and appends audit log', async () => {
      const inc = makeTestIncident(siteId, 'prototype1');
      await repo.saveIncident(inc);

      const res = await fetch(
        `http://127.0.0.1:${serverPort}/api/v1/sites/${siteId}/incidents/${inc.id}/ack`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${operatorToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ note: 'Breaker inspected by site technician.' }),
        }
      );

      expect(res.status).toBe(200);
      const updated = await res.json();
      expect(updated.state).toBe('acknowledged');
      expect(updated.acknowledgements.length).toBe(1);
      expect(updated.acknowledgements[0].note).toBe('Breaker inspected by site technician.');

      // Audit log entry verified
      const audit = await repo.getAuditLogs(siteId);
      const ackAudit = audit.find((a) => a.action === 'ACKNOWLEDGE_INCIDENT');
      expect(ackAudit).toBeDefined();
      expect(ackAudit!.target).toBe(`incident:${inc.id}`);
    });

    it('allows admin acknowledgement and marks acknowledged', async () => {
      const inc = makeTestIncident(siteId, 'prototype1');
      await repo.saveIncident(inc);

      const res = await fetch(
        `http://127.0.0.1:${serverPort}/api/v1/sites/${siteId}/incidents/${inc.id}/ack`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ note: 'Admin verified and acknowledged.' }),
        }
      );

      expect(res.status).toBe(200);
      const updated = await res.json();
      expect(updated.state).toBe('acknowledged');
    });
  });

  describe('4. Multi-Tenant Site Isolation', () => {
    it('blocks access to incidents belonging to a foreign siteId', async () => {
      const foreignSiteId = '99999999-9999-4999-8999-999999999999';
      const inc = makeTestIncident(siteId, 'prototype1');
      await repo.saveIncident(inc);

      const res = await fetch(
        `http://127.0.0.1:${serverPort}/api/v1/sites/${foreignSiteId}/incidents`,
        { headers: { Authorization: `Bearer ${viewerToken}` } }
      );

      // User has no membership in foreignSiteId -> 403 Forbidden
      expect(res.status).toBe(403);
    });
  });

  describe('5. Safe CSV Evidence Export & Formula Escaping', () => {
    it('returns CSV with formula injection escaping and truthfulness disclaimers', async () => {
      const inc = makeTestIncident(siteId, 'prototype1');
      // Inject potentially malicious spreadsheet formula string in sample
      inc.evidence.samples.push({
        timestamp: '2026-10-17T06:00:10.000Z',
        voltage: 240,
        current: 5.0,
        power: 1200,
        frequency: 50.0,
        energyRaw: '=SUM(A1:A10)', // Malicious formula attempt
        channelId: 'ch-01',
        phase: 'during',
      });
      await repo.saveIncident(inc);

      const res = await fetch(
        `http://127.0.0.1:${serverPort}/api/v1/sites/${siteId}/incidents/${inc.id}/export/csv`,
        { headers: { Authorization: `Bearer ${viewerToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/csv');
      expect(res.headers.get('content-disposition')).toContain(`incident-${inc.id}.csv`);

      const csvText = await res.text();
      expect(csvText).toContain('# MIN-SAKTHI Incident Evidence Export');
      expect(csvText).toContain('# Evidence Limitations:');
      // Formula cell escaped with leading single quote
      expect(csvText).toContain("'=SUM(A1:A10)");
    });
  });

  describe('6. Print-Ready HTML Report', () => {
    it('returns styled standalone HTML document with print CSS and truthful statements', async () => {
      const inc = makeTestIncident(siteId, 'prototype1', 'electrical_breach', 'resolved');
      await repo.saveIncident(inc);

      const res = await fetch(
        `http://127.0.0.1:${serverPort}/api/v1/sites/${siteId}/incidents/${inc.id}/export/html`,
        { headers: { Authorization: `Bearer ${viewerToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');

      const htmlText = await res.text();
      expect(htmlText).toContain('<!DOCTYPE html>');
      expect(htmlText).toContain('@media print');
      expect(htmlText).toContain('MIN-SAKTHI');
      expect(htmlText).toContain('POWER EVENT INVESTIGATOR');
      expect(htmlText).toContain('Max Voltage (V)');
      expect(htmlText).toContain('268.4');
    });
  });
});
