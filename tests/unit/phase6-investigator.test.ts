import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import type { TelemetryPayload, AlertRule, IncidentRecord } from '@minsakthi/contracts';
import { IncidentEvaluator } from '../../apps/server/src/incidents/evaluator.js';
import { MemoryTelemetryRepository } from '../../apps/server/src/storage/db.js';
import { IngestMetrics } from '../../apps/server/src/observability/metrics.js';
import { IncidentReplay } from '../../apps/web/src/features/incidents/IncidentReplay.js';
import { IncidentDetail } from '../../apps/web/src/features/incidents/IncidentDetail.js';
import { IncidentList } from '../../apps/web/src/features/incidents/IncidentList.js';
import { AuthProvider } from '../../apps/web/src/auth/AuthContext.js';

function makeMockSample(
  deviceId: string,
  channelId: string,
  receivedAt: string,
  values: { voltage?: number; current?: number; power?: number; frequency?: number } = {},
  retained = false
): TelemetryPayload {
  return {
    eventId: crypto.randomUUID(),
    siteId: '11111111-1111-4111-8111-111111111111',
    deviceId,
    channelId,
    receivedAt,
    serverEpoch: 'epoch-1',
    sequence: 1,
    retained,
    suspectDuplicate: false,
    quality: [],
    configVersion: 1,
    values: {
      voltage: values.voltage ?? 230,
      current: values.current ?? 5,
      power: values.power ?? 1150,
      energyRaw: '1000.0',
      frequency: values.frequency ?? 50,
    },
  };
}

describe('Phase 6 Unit Suite: Power Event Investigator Lifecycle & Truthful Evidence', () => {
  let repo: MemoryTelemetryRepository;
  let evaluator: IncidentEvaluator;
  const siteId = '11111111-1111-4111-8111-111111111111';
  const deviceId = 'prototype1';

  beforeEach(async () => {
    repo = new MemoryTelemetryRepository();
    const metrics = IngestMetrics.getInstance();
    metrics.brokerConnected = true;
    metrics.brokerSubscribed = true;
    evaluator = new IncidentEvaluator(repo, {
      windowBeforeMs: 5000,
      windowAfterMs: 5000,
      cooldownMs: 10000,
    });
    await evaluator.initialize();
  });

  describe('IncidentEvaluator - Electrical Threshold Breaches', () => {
    const voltageRule: AlertRule = {
      id: 'rule-volt-high',
      siteId,
      deviceId,
      channelId: 'ch-01',
      metric: 'voltage',
      operator: 'gt',
      threshold: 250,
      debounceMs: 0,
      hysteresis: 5, // Recovers below 245
      severity: 'critical',
      enabled: true,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('captures before-window, breach extrema, and persists evaluating incident', async () => {
      const baseTime = Date.now();
      const t0 = new Date(baseTime - 3000).toISOString();
      const t1 = new Date(baseTime).toISOString();

      // Normal reading before breach (should be captured in before-window history)
      await repo.insertTelemetryBatch([makeMockSample(deviceId, 'ch-01', t0, { voltage: 235 })]);

      // Breach reading: 265V (> 250V)
      const breachSample = makeMockSample(deviceId, 'ch-01', t1, { voltage: 265 });
      await evaluator.processTelemetrySample(breachSample, [voltageRule]);

      const active = await repo.getActiveIncidents(siteId);
      expect(active.length).toBe(1);

      const inc = active[0]!;
      expect(inc.type).toBe('electrical_breach');
      expect(inc.state).toBe('evaluating');
      expect(inc.severity).toBe('critical');
      expect(inc.evidence.ruleSnapshot?.metric).toBe('voltage');
      expect(inc.evidence.ruleSnapshot?.threshold).toBe(250);
      expect(inc.evidence.extrema.maxVoltage).toBe(265);
      expect(inc.summary).toContain('250');
      expect(inc.summary).toContain('ch-01');
      // Before-window sample captured from repository
      expect(inc.evidence.samples.some((s) => s.phase === 'before')).toBe(true);
      expect(inc.evidence.samples.some((s) => s.phase === 'during')).toBe(true);
    });

    it('handles hysteresis recovery and completes after-window into resolved state', async () => {
      const baseTime = Date.now();
      const t0 = new Date(baseTime).toISOString();
      const t1 = new Date(baseTime + 2000).toISOString();
      const t2 = new Date(baseTime + 8000).toISOString(); // > 5000ms after-window

      // 1. Breach
      await evaluator.processTelemetrySample(
        makeMockSample(deviceId, 'ch-01', t0, { voltage: 270 }),
        [voltageRule]
      );

      // 2. Sample inside hysteresis deadband (248V is < 250 but > 245 -> still violating)
      await evaluator.processTelemetrySample(
        makeMockSample(deviceId, 'ch-01', t1, { voltage: 248 }),
        [voltageRule]
      );
      const active = await repo.getActiveIncidents(siteId);
      expect(active[0]!.evidence.recoveryTime).toBeFalsy();

      // 3. Clear recovery (240V < 245) begins after-window
      const recoverySample = makeMockSample(deviceId, 'ch-01', t2, { voltage: 240 });
      await evaluator.processTelemetrySample(recoverySample, [voltageRule]);

      // 4. Sample past the 5000ms after-window completes resolution
      const t3 = new Date(baseTime + 15000).toISOString();
      await evaluator.processTelemetrySample(
        makeMockSample(deviceId, 'ch-01', t3, { voltage: 238 }),
        [voltageRule]
      );

      const all = await repo.getIncidents(siteId, {});
      const resolved = all.incidents.find((i) => i.type === 'electrical_breach');
      expect(resolved).toBeDefined();
      expect(resolved!.state).toBe('resolved');
      expect(resolved!.evidence.recoveryTime).toBeDefined();
      expect(resolved!.endedAt).toBeDefined();
    });
  });

  describe('IncidentEvaluator - Truthful Device Silence vs Broker Transport Interruption', () => {
    it('creates device_interruption with unconfirmed cause when broker is healthy and device is silent', async () => {
      const now = Date.now();
      const metrics = IngestMetrics.getInstance();
      metrics.brokerConnected = true;
      metrics.brokerSubscribed = true;

      // Device last seen 15 seconds ago (configuredInterval is 5s, offline threshold is 10s)
      evaluator.setDeviceLastSeenForTesting(deviceId, now - 15000);

      await evaluator.checkCadence(now);

      const active = await repo.getActiveIncidents(siteId);
      expect(active.length).toBe(1);

      const inc = active[0]!;
      expect(inc.type).toBe('device_interruption');
      expect(inc.causeConfirmation).toBe('device_silence_unconfirmed');
      expect(inc.title).toContain('Device Telemetry Silence');
      expect(inc.summary).toContain('Physical power cut vs Wi-Fi/firmware failure unverified');
      expect(inc.evidence.transportHealth.brokerConnected).toBe(true);
    });

    it('classifies cause as transport_interruption when broker/worker transport is down, never masquerading as power cut', async () => {
      const now = Date.now();
      // Transport is down!
      const metrics = IngestMetrics.getInstance();
      metrics.brokerConnected = false;
      metrics.brokerSubscribed = false;

      evaluator.setDeviceLastSeenForTesting(deviceId, now - 15000);

      await evaluator.checkCadence(now);

      const active = await repo.getActiveIncidents(siteId);
      expect(active.length).toBe(1);

      const inc = active[0]!;
      expect(inc.type).toBe('transport_outage');
      expect(inc.causeConfirmation).toBe('transport_interruption');
      expect(inc.title).toContain('Monitoring Transport Interrupted');
      expect(inc.summary).toContain('Broker or worker transport disconnected');
      expect(inc.evidence.transportHealth.brokerConnected).toBe(false);
    });

    it('retained-only reconnect message does NOT clear silence or trigger recovery', async () => {
      const now = Date.now();
      const metrics = IngestMetrics.getInstance();
      metrics.brokerConnected = true;
      metrics.brokerSubscribed = true;
      evaluator.setDeviceLastSeenForTesting(deviceId, now - 15000);
      await evaluator.checkCadence(now);

      const activeBefore = await repo.getActiveIncidents(siteId);
      expect(activeBefore.length).toBe(1);
      expect(activeBefore[0]!.evidence.recoveryTime).toBeFalsy();

      // Ingest retained sample (retained: true)
      const retainedSample = makeMockSample(deviceId, 'ch-01', new Date().toISOString(), { voltage: 230 }, true);
      await evaluator.processTelemetrySample(retainedSample, []);

      // Active incident must NOT record recovery from retained payload
      const activeAfter = await repo.getActiveIncidents(siteId);
      expect(activeAfter[0]!.evidence.recoveryTime).toBeFalsy();
    });

    it('flapping cooldown consolidates intermittent interruptions into single incident with observation gaps', async () => {
      const baseTime = Date.now();
      const metrics = IngestMetrics.getInstance();
      metrics.brokerConnected = true;
      metrics.brokerSubscribed = true;

      // 1. Initial silence
      evaluator.setDeviceLastSeenForTesting(deviceId, baseTime - 12000);
      await evaluator.checkCadence(baseTime);

      const active = await repo.getActiveIncidents(siteId);
      expect(active.length).toBe(1);
      const incId = active[0]!.id;

      // 2. Recover with live sample
      const live1 = makeMockSample(deviceId, 'ch-01', new Date(baseTime).toISOString());
      await evaluator.processTelemetrySample(live1, []);

      // 3. Fast complete after-window (>5000ms)
      const live2 = makeMockSample(deviceId, 'ch-01', new Date(baseTime + 6000).toISOString());
      await evaluator.processTelemetrySample(live2, []);

      // Incident is resolved and in cooldown (cooldownMs = 10000ms)
      const allInc = (await repo.getIncidents(siteId, {})).incidents;
      expect(allInc[0]!.state).toBe('resolved');

      // 4. Interruption recurs within cooldown period (+8000ms from base)
      evaluator.setDeviceLastSeenForTesting(deviceId, baseTime + 8000 - 12000);
      await evaluator.checkCadence(baseTime + 8000);

      // Must consolidate into original incident rather than creating a duplicate
      const allAfterFlap = (await repo.getIncidents(siteId, {})).incidents;
      expect(allAfterFlap.length).toBe(1);
      expect(allAfterFlap[0]!.id).toBe(incId);
      expect(allAfterFlap[0]!.state).toBe('evaluating');
      expect(allAfterFlap[0]!.evidence.gaps.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('IncidentEvaluator - Worker Restart Durability', () => {
    it('recovers active incidents from repository and records worker restart gap', async () => {
      const baseTime = Date.now();
      // Seed evaluating incident in repository
      const evaluatingInc: IncidentRecord = {
        id: 'inc-durability-01',
        siteId,
        deviceId,
        channelId: 'ch-01',
        title: 'Active Power Interruption',
        summary: 'Device telemetry silence ongoing',
        severity: 'critical',
        state: 'evaluating',
        type: 'device_interruption',
        causeConfirmation: 'device_silence_unconfirmed',
        startedAt: new Date(baseTime - 30000).toISOString(),
        endedAt: null,
        durationMs: 30,
        evidence: {
          windowBeforeMs: 120000,
          windowAfterMs: 120000,
          detectionTime: new Date(baseTime - 30000).toISOString(),
          recoveryTime: null,
          lastReceivedAt: new Date(baseTime - 30000).toISOString(),
          ruleSnapshot: null,
          mappingVersion: 1,
          transportHealth: { brokerConnected: true, brokerSubscribed: true },
          samples: [],
          gaps: [],
          extrema: {},
          sourceEventIds: [],
        },
        acknowledgements: [],
        createdAt: new Date(baseTime - 30000).toISOString(),
        updatedAt: new Date(baseTime - 30000).toISOString(),
      };
      await repo.saveIncident(evaluatingInc);

      // Create new evaluator simulating process restart
      const newEvaluator = new IncidentEvaluator(repo);
      await newEvaluator.initialize({
        startAt: new Date(baseTime - 5000).toISOString(),
        endAt: new Date(baseTime).toISOString(),
      });

      const recovered = await repo.getIncidentById(siteId, 'inc-durability-01');
      expect(recovered).toBeDefined();
      expect(recovered!.state).toBe('evaluating');
      expect(recovered!.evidence.gaps.some((g) => g.reason === 'Worker restart observation gap')).toBe(true);
    });
  });

  describe('Deterministic Summaries & CSV Formula Escaping', () => {
    it('generates strictly deterministic summary text without LLM speculation', () => {
      const summary = evaluator.generateDeterministicSummaryForTesting({
        type: 'electrical_breach',
        triggerMetric: 'voltage',
        triggerValue: 272.5,
        durationMs: 45,
        channelId: 'ch-02',
        extrema: { maxVoltage: 272.5 },
      });

      expect(summary).toContain('voltage');
      expect(summary).toContain('250');
      expect(summary).toContain('45s');
      expect(summary).toContain('ch-02');
      // No speculative words
      expect(summary).not.toContain('likely');
      expect(summary).not.toContain('AI');
      expect(summary).not.toContain('LLM');
    });

    it('escapes dangerous spreadsheet formula characters in CSV fields', () => {
      const dangerousInputs = [
        '=cmd|"/C calc"!A0',
        '+12345',
        '-5000',
        '@SUM(A1:A10)',
        '\tTAB_INDENT',
        '\rCR_PREFIX',
      ];

      for (const input of dangerousInputs) {
        const escaped = evaluator.escapeCsvForTesting(input);
        expect(escaped).toMatch(/^"?[']/);
      }

      // Normal strings do not get single-quote prefix
      expect(evaluator.escapeCsvForTesting('normal text')).toBe('normal text');
    });
  });

  describe('UI Feature Components SSR Verification', () => {
    const mockIncident: IncidentRecord = {
      id: 'inc-ui-test-1',
      siteId,
      deviceId,
      channelId: 'ch-01',
      title: 'Phase A Over-Voltage Breach',
      summary: 'Voltage breach reached 264.2 V on ch-01 (duration 18s). Resolved.',
      severity: 'critical',
      state: 'resolved',
      type: 'electrical_breach',
      causeConfirmation: 'electrical_breach',
      durationMs: 18,
      startedAt: '2026-10-17T06:00:00.000Z',
      endedAt: '2026-10-17T06:00:18.000Z',
      evidence: {
        windowBeforeMs: 120000,
        windowAfterMs: 120000,
        detectionTime: '2026-10-17T06:00:00.000Z',
        recoveryTime: '2026-10-17T06:00:18.000Z',
        lastReceivedAt: '2026-10-17T06:00:20.000Z',
        channelLabel: 'Phase A',
        ruleSnapshot: {
          ruleId: 'rule-volt',
          metric: 'voltage',
          operator: 'gt',
          threshold: 250,
          debounceMs: 0,
          hysteresis: 5,
          version: 1,
        },
        transportHealth: { brokerConnected: true, brokerSubscribed: true },
        samples: [
          {
            timestamp: '2026-10-17T05:59:50.000Z',
            channelId: 'ch-01',
            voltage: 238,
            current: 4.8,
            power: 1142,
            frequency: 50.0,
            energyRaw: '100.1',
            phase: 'before',
          },
          {
            timestamp: '2026-10-17T06:00:00.000Z',
            channelId: 'ch-01',
            voltage: 264.2,
            current: 5.2,
            power: 1373,
            frequency: 50.1,
            energyRaw: '100.2',
            phase: 'during',
          },
          {
            timestamp: '2026-10-17T06:00:20.000Z',
            channelId: 'ch-01',
            voltage: 239,
            current: 4.7,
            power: 1123,
            frequency: 50.0,
            energyRaw: '100.3',
            phase: 'after',
          },
        ],
        gaps: [
          {
            startAt: '2026-10-17T06:00:05.000Z',
            endAt: '2026-10-17T06:00:10.000Z',
            durationMs: 5000,
            reason: 'Packet delivery timeout',
          },
        ],
        extrema: {
          minVoltage: 238,
          maxVoltage: 264.2,
          maxCurrent: 5.2,
          maxPower: 1373,
          minFrequency: 50.0,
          maxFrequency: 50.1,
        },
        sourceEventIds: ['ev-1', 'ev-2'],
      },
      acknowledgements: [],
      createdAt: '2026-10-17T06:00:00.000Z',
      updatedAt: '2026-10-17T06:00:20.000Z',
    };

    it('IncidentReplay renders strictly labeled historical replay banner and keyboard controls', () => {
      const html = renderToString(React.createElement(IncidentReplay, { incident: mockIncident }));

      // Strict Historical Labeling (never masquerade as live)
      expect(html).toContain('HISTORICAL TIMELINE REPLAY — NOT LIVE TELEMETRY');
      // Paused by default
      expect(html).toContain('aria-label="Play replay"');
      expect(html).toContain('<span>Replay</span>');
      // Accessible slider
      expect(html).toContain('aria-label="Timeline position"');
      expect(html).toContain('type="range"');
      // Multi-channel values rendered for initial frame (before-event baseline)
      expect(html).toContain('238.0 V');
    });

    it('IncidentDetail renders deterministic summary, extrema grid, gaps, and export triggers', () => {
      const html = renderToString(
        React.createElement(AuthProvider, null,
          React.createElement(IncidentDetail, {
            incident: mockIncident,
            onBack: () => {},
          })
        )
      );

      // Deterministic Summary
      expect(html).toContain('Deterministic Incident Finding');
      expect(html).toContain('Voltage breach reached 264.2 V');

      // Extrema grid
      expect(html).toContain('Max Voltage');
      expect(html).toContain('264.2 V');
      expect(html).toContain('Max Current');
      expect(html).toContain('5.20 A');

      // Observation Gaps table
      expect(html).toContain('Observation Gaps');
      expect(html).toContain('Packet delivery timeout');

      // Export and Print buttons
      expect(html).toContain('Export CSV');
      expect(html).toContain('Print Report');

      // Disclaimers
      expect(html).toContain('Evidence Limitations:');
    });

    it('IncidentList renders severity badge, titles, duration and filter controls', () => {
      const html = renderToString(
        React.createElement(IncidentList, {
          incidents: [mockIncident],
          isLoading: false,
          onSelectIncident: () => {},
        })
      );

      expect(html).toContain('Phase A Over-Voltage Breach');
      expect(html).toContain('critical');
      expect(html).toContain('resolved');
      expect(html).toContain('Investigate');
      expect(html).toContain('18s');
    });
  });
});
