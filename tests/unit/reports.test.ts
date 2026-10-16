import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeReportTimeRange,
  generateReport,
} from '../../apps/server/src/reports/engine.js';
import type { TelemetryPayload } from '@minsakthi/contracts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FixtureCase {
  id: string;
  testOnly?: boolean;
  unit?: string;
  semantics?: string;
  counterValues?: string[];
  sameVerifiedEpoch?: boolean;
  expectedUsageKwh?: string | null;
  testTariffInrPerKwh?: string;
  expectedEstimatedCostInr?: string;
  allBillingEvidenceApproved?: boolean;
  verifiedBilling?: boolean;
  expectedKnownIntervalWh?: string;
  excludedIntervalIndices?: number[];
  complete?: boolean;
  timezone?: string;
  localDate?: string;
  localMonth?: string;
  expectedUtcFromInclusive?: string;
  expectedUtcToExclusive?: string;
}

function makeMockSample(channelId: string, energyRaw: string, timeIso: string): TelemetryPayload {
  return {
    eventId: crypto.randomUUID(),
    siteId: '11111111-1111-4111-8111-111111111111',
    deviceId: 'prototype1',
    channelId,
    receivedAt: timeIso,
    serverEpoch: '22222222-2222-4222-8222-222222222222',
    sequence: 1,
    retained: false,
    suspectDuplicate: false,
    quality: [],
    configVersion: 1,
    values: {
      voltage: 240,
      current: 1.0,
      power: 240,
      energyRaw,
      frequency: 50.0,
    },
  };
}

describe('Reports Engine (Phase 5: R12, R13, T17, T18, T19)', () => {
  const fixturesPath = path.resolve(__dirname, '../fixtures/report_cases.json');
  const fixtureCases: FixtureCase[] = JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));

  it('correctly maps Asia/Kolkata local civil day boundaries to UTC half-open interval (india_day)', () => {
    const c = fixtureCases.find((x) => x.id === 'india_day')!;
    const { fromUtc, toUtc } = computeReportTimeRange('daily', c.localDate!, c.timezone!);
    expect(fromUtc).toBe(c.expectedUtcFromInclusive);
    expect(toUtc).toBe(c.expectedUtcToExclusive);
  });

  it('correctly maps Asia/Kolkata local civil month boundaries to UTC half-open interval (india_month)', () => {
    const c = fixtureCases.find((x) => x.id === 'india_month')!;
    const { fromUtc, toUtc } = computeReportTimeRange('monthly', c.localMonth!, c.timezone!);
    expect(fromUtc).toBe(c.expectedUtcFromInclusive);
    expect(toUtc).toBe(c.expectedUtcToExclusive);
  });

  it('calculates verified Wh delta and estimates cost at test tariff ₹8/kWh (verified_wh_flat_test_tariff)', () => {
    const c = fixtureCases.find((x) => x.id === 'verified_wh_flat_test_tariff')!;
    const baseTime = new Date('2026-10-16T00:00:00.000Z').getTime();

    const samples: TelemetryPayload[] = c.counterValues!.map((val, idx) =>
      makeMockSample('channel1', val, new Date(baseTime + idx * 5000).toISOString())
    );

    const samplesByChannel = new Map([['channel1', samples]]);
    const channelMeta = new Map([
      ['channel1', { displaySlot: 1, label: 'Main', unit: c.unit, semantics: c.semantics }],
    ]);

    const report = generateReport(
      {
        siteId: '11111111-1111-4111-8111-111111111111',
        deviceId: 'prototype1',
        periodType: 'daily',
        dateOrMonth: '2026-10-16',
        timezone: 'UTC', // use UTC for this test to match baseTime
        testTariffInrPerKwh: Number(c.testTariffInrPerKwh),
        allBillingEvidenceApproved: c.allBillingEvidenceApproved,
      },
      samplesByChannel,
      channelMeta
    );

    expect(report.totals.totalUsageKwh).toBe(c.expectedUsageKwh);
    expect(report.totals.costEstimateInr).toBe(c.expectedEstimatedCostInr);
    expect(report.totals.isCostVerified).toBe(false); // Verified billing false as required
    expect(report.totals.billingSuppressionNotice).toContain('PREVIEW TEST TARIFF');
  });

  it('suppresses usage and billing when counter unit is unknown or token (unknown_units)', () => {
    const c = fixtureCases.find((x) => x.id === 'unknown_units')!;
    const baseTime = new Date('2026-10-16T00:00:00.000Z').getTime();

    const samples: TelemetryPayload[] = c.counterValues!.map((val, idx) =>
      makeMockSample('channel1', val, new Date(baseTime + idx * 5000).toISOString())
    );

    const samplesByChannel = new Map([['channel1', samples]]);
    const channelMeta = new Map([
      ['channel1', { displaySlot: 1, label: 'Main', unit: c.unit }],
    ]);

    const report = generateReport(
      {
        siteId: '11111111-1111-4111-8111-111111111111',
        deviceId: 'prototype1',
        periodType: 'daily',
        dateOrMonth: '2026-10-16',
        timezone: 'UTC',
      },
      samplesByChannel,
      channelMeta
    );

    expect(report.totals.totalUsageKwh).toBeNull();
    expect(report.totals.costEstimateInr).toBeNull();
    expect(report.totals.isCostVerified).toBe(false);
    expect(report.totals.billingSuppressionNotice).toContain('Verified billing calculation suppressed');
    expect(report.status).toBe('unverified_units');
  });

  it('detects counter reset and excludes invalid interval without invented interpolation (reset)', () => {
    const c = fixtureCases.find((x) => x.id === 'reset')!;
    const baseTime = new Date('2026-10-16T00:00:00.000Z').getTime();

    // 1000 -> 10 -> 20. Delta 1000->10 is reset (excluded). Delta 10->20 is 10 Wh = 0.0100 kWh.
    const samples: TelemetryPayload[] = c.counterValues!.map((val, idx) =>
      makeMockSample('channel1', val, new Date(baseTime + idx * 5000).toISOString())
    );

    const samplesByChannel = new Map([['channel1', samples]]);
    const channelMeta = new Map([
      ['channel1', { displaySlot: 1, label: 'Main', unit: c.unit }],
    ]);

    const report = generateReport(
      {
        siteId: '11111111-1111-4111-8111-111111111111',
        deviceId: 'prototype1',
        periodType: 'daily',
        dateOrMonth: '2026-10-16',
        timezone: 'UTC',
      },
      samplesByChannel,
      channelMeta
    );

    const chReport = report.totals.channels['channel1']!;
    expect(chReport.coverage.excludedIntervalIndices).toEqual(c.excludedIntervalIndices);
    expect(chReport.usageKwh).toBe('0.01'); // 10 Wh = 0.0100 kWh
    expect(chReport.isEstimated).toBe(true);
  });

  it('disables verified billing for incremental energy counters without event identity proof (incremental_ambiguous_duplicates)', () => {
    const c = fixtureCases.find((x) => x.id === 'incremental_ambiguous_duplicates')!;
    const baseTime = new Date('2026-10-16T00:00:00.000Z').getTime();

    const samples: TelemetryPayload[] = c.counterValues!.map((val, idx) =>
      makeMockSample('channel1', val, new Date(baseTime + idx * 5000).toISOString())
    );

    const samplesByChannel = new Map([['channel1', samples]]);
    const channelMeta = new Map([
      ['channel1', { displaySlot: 1, label: 'Main', unit: c.unit, semantics: c.semantics }],
    ]);

    const report = generateReport(
      {
        siteId: '11111111-1111-4111-8111-111111111111',
        deviceId: 'prototype1',
        periodType: 'daily',
        dateOrMonth: '2026-10-16',
        timezone: 'UTC',
      },
      samplesByChannel,
      channelMeta
    );

    expect(report.totals.totalUsageKwh).toBeNull();
    expect(report.totals.isCostVerified).toBe(false);
  });
});
