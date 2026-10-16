import type {
  ReportRecord,
  ReportCoverage,
  ReportTotals,
  ChannelReportSummary,
  GapInterval,
  ReportPeriodType,
} from '@minsakthi/contracts';
import type { TelemetryPayload } from '@minsakthi/contracts';

export interface ReportCalculationOptions {
  siteId: string;
  deviceId: string;
  periodType: ReportPeriodType;
  dateOrMonth: string; // 'YYYY-MM-DD' or 'YYYY-MM'
  timezone?: string; // default 'Asia/Kolkata'
  cutoff?: string; // ISO UTC cutoff timestamp
  expectedIntervalMs?: number; // default 5000ms
  testTariffInrPerKwh?: number; // Only for TEST ONLY approved tariff fixtures
  allBillingEvidenceApproved?: boolean; // Default false
}

/**
 * Compute UTC half-open boundaries [fromInclusive, toExclusive) for site-local civil time.
 * For Asia/Kolkata (UTC+5:30):
 *  - Civil day 2026-10-16 starts at 2026-10-15T18:30:00.000Z and ends at 2026-10-16T18:30:00.000Z
 *  - Civil month 2026-10 starts at 2026-09-30T18:30:00.000Z and ends at 2026-10-31T18:30:00.000Z
 */
export function computeReportTimeRange(
  periodType: ReportPeriodType,
  dateOrMonth: string,
  timezone = 'Asia/Kolkata'
): { fromUtc: string; toUtc: string } {
  // Asia/Kolkata is fixed UTC+05:30 (330 minutes)
  const offsetMinutes = timezone === 'Asia/Kolkata' ? 330 : 0;
  const offsetMs = offsetMinutes * 60 * 1000;

  if (periodType === 'daily') {
    // dateOrMonth: YYYY-MM-DD
    const [yearStr, monthStr, dayStr] = dateOrMonth.split('-');
    const year = parseInt(yearStr!, 10);
    const month = parseInt(monthStr!, 10) - 1; // 0-indexed
    const day = parseInt(dayStr!, 10);

    // Midnight local start
    const localStartUtcMs = Date.UTC(year, month, day, 0, 0, 0, 0) - offsetMs;
    // Midnight local end (next day)
    const localEndUtcMs = Date.UTC(year, month, day + 1, 0, 0, 0, 0) - offsetMs;

    return {
      fromUtc: new Date(localStartUtcMs).toISOString(),
      toUtc: new Date(localEndUtcMs).toISOString(),
    };
  } else {
    // periodType === 'monthly', dateOrMonth: YYYY-MM
    const [yearStr, monthStr] = dateOrMonth.split('-');
    const year = parseInt(yearStr!, 10);
    const month = parseInt(monthStr!, 10) - 1;

    const localStartUtcMs = Date.UTC(year, month, 1, 0, 0, 0, 0) - offsetMs;
    // Month + 1, day 1 is start of next month
    const localEndUtcMs = Date.UTC(year, month + 1, 1, 0, 0, 0, 0) - offsetMs;

    return {
      fromUtc: new Date(localStartUtcMs).toISOString(),
      toUtc: new Date(localEndUtcMs).toISOString(),
    };
  }
}

/**
 * Core analytical report calculation engine.
 * Adheres strictly to DATA_MODEL.md Aggregation truth and TEST_PLAN.md T17–T19:
 * - Half-open civil boundaries
 * - Verified counter deltas in same epoch
 * - Reset and gap exclusion without invented interpolation
 * - Prominent suppression of verified billing when units/tariffs are uncertified
 */
export function generateReport(
  options: ReportCalculationOptions,
  samplesByChannel: Map<string, TelemetryPayload[]>,
  channelMetadata: Map<string, { displaySlot: number | null; label: string; unit?: string; semantics?: string }>,
  existingRevision = 1
): ReportRecord {
  const timezone = options.timezone || 'Asia/Kolkata';
  const { fromUtc, toUtc } = computeReportTimeRange(options.periodType, options.dateOrMonth, timezone);
  const cutoff = options.cutoff || new Date().toISOString();
  const cutoffMs = new Date(cutoff).getTime();
  const fromMs = new Date(fromUtc).getTime();
  const toMs = new Date(toUtc).getTime();
  const expectedIntervalMs = options.expectedIntervalMs || 5000;
  const expectedSampleCount = Math.max(1, Math.round((toMs - fromMs) / expectedIntervalMs));

  let totalUsageKwhNum = 0;
  let allChannelsUnitKnown = true;
  let hasAnyKnownUsage = false;
  let totalReceivedSamples = 0;
  const channelSummaries: Record<string, ChannelReportSummary> = {};

  const allGaps: GapInterval[] = [];
  const allExcludedIndices: number[] = [];

  for (const [channelId, samples] of samplesByChannel.entries()) {
    const meta = channelMetadata.get(channelId) || {
      displaySlot: null,
      label: channelId,
      unit: 'unknown',
      semantics: 'cumulative',
    };
    const unit = meta.unit || 'unknown';
    const semantics = meta.semantics || 'cumulative';

    // Filter samples within half-open interval [fromMs, toMs) and before cutoff
    const filtered = samples
      .filter((s) => {
        const t = new Date(s.receivedAt).getTime();
        return t >= fromMs && t < toMs && t <= cutoffMs;
      })
      .sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());

    totalReceivedSamples += filtered.length;

    // Gaps and boundaries
    const gaps: GapInterval[] = [];
    const excludedIndices: number[] = [];

    let boundaryQuality: 'complete' | 'missing_start' | 'missing_end' | 'incomplete' = 'complete';
    if (filtered.length === 0) {
      boundaryQuality = 'incomplete';
    } else {
      const firstT = new Date(filtered[0]!.receivedAt).getTime();
      const lastT = new Date(filtered[filtered.length - 1]!.receivedAt).getTime();
      const startMissing = firstT - fromMs > expectedIntervalMs * 2;
      const endMissing = toMs - lastT > expectedIntervalMs * 2;

      if (startMissing && endMissing) {
        boundaryQuality = 'incomplete';
      } else if (startMissing) {
        boundaryQuality = 'missing_start';
      } else if (endMissing) {
        boundaryQuality = 'missing_end';
      }
    }

    // Identify gaps > 3x interval
    for (let i = 0; i < filtered.length - 1; i++) {
      const curT = new Date(filtered[i]!.receivedAt).getTime();
      const nextT = new Date(filtered[i + 1]!.receivedAt).getTime();
      const diff = nextT - curT;
      if (diff > expectedIntervalMs * 3) {
        const gap: GapInterval = {
          from: filtered[i]!.receivedAt,
          to: filtered[i + 1]!.receivedAt,
          durationSeconds: Math.round(diff / 1000),
          reason: 'PACKET_TIMEOUT_GAP',
        };
        gaps.push(gap);
        allGaps.push(gap);
      }
    }

    // Delta energy calculations
    let channelUsageKwh: string | null = null;
    let isEstimated = false;

    if (unit === 'unknown' || unit === 'token') {
      allChannelsUnitKnown = false;
      channelUsageKwh = null;
    } else if (semantics === 'incremental') {
      // Incremental without sequence proof cannot verify duplicates (T19)
      channelUsageKwh = null;
      allChannelsUnitKnown = false;
    } else if (filtered.length >= 2) {
      // Cumulative delta summation across valid adjacent pairs
      let deltaSum = 0;
      let hasValidDelta = false;

      for (let i = 0; i < filtered.length - 1; i++) {
        const c1 = filtered[i]!.values.energyRaw;
        const c2 = filtered[i + 1]!.values.energyRaw;

        if (c1 === null || c2 === null) {
          excludedIndices.push(i);
          continue;
        }

        const v1 = Number(c1);
        const v2 = Number(c2);

        // Counter reset check (v2 < v1)
        if (v2 < v1) {
          excludedIndices.push(i);
          continue;
        }

        // Normal valid delta
        const delta = v2 - v1;
        deltaSum += delta;
        hasValidDelta = true;
      }

      if (hasValidDelta) {
        hasAnyKnownUsage = true;
        // Convert unit explicitly: Wh -> /1000 -> kWh
        const kwh = unit.toLowerCase() === 'wh' ? deltaSum / 1000 : deltaSum;
        channelUsageKwh = String(Number(kwh.toFixed(4)));
        totalUsageKwhNum += kwh;
        if (excludedIndices.length > 0 || gaps.length > 0) {
          isEstimated = true;
        }
      }
    }

    const startCounter = filtered.length > 0 && filtered[0]!.values.energyRaw !== null
      ? String(filtered[0]!.values.energyRaw)
      : null;
    const endCounter = filtered.length > 0 && filtered[filtered.length - 1]!.values.energyRaw !== null
      ? String(filtered[filtered.length - 1]!.values.energyRaw)
      : null;

    const timeCoveredFraction = Math.min(1.0, filtered.length / expectedSampleCount);

    const coverage: ReportCoverage = {
      expectedSampleCount,
      receivedSampleCount: filtered.length,
      timeCoveredFraction: Number(timeCoveredFraction.toFixed(4)),
      boundaryQuality,
      gaps,
      excludedIntervalIndices: excludedIndices,
    };

    channelSummaries[channelId] = {
      channelId,
      displaySlot: meta.displaySlot,
      label: meta.label,
      startCounter,
      endCounter,
      usageKwh: channelUsageKwh,
      isEstimated,
      coverage,
      unit,
    };
  }

  // Aggregate coverage
  const aggregateCoverageFraction = Math.min(
    1.0,
    totalReceivedSamples / (expectedSampleCount * Math.max(1, samplesByChannel.size))
  );

  const overallCoverage: ReportCoverage = {
    expectedSampleCount: expectedSampleCount * Math.max(1, samplesByChannel.size),
    receivedSampleCount: totalReceivedSamples,
    timeCoveredFraction: Number(aggregateCoverageFraction.toFixed(4)),
    boundaryQuality: allGaps.length === 0 ? 'complete' : 'incomplete',
    gaps: allGaps,
    excludedIntervalIndices: allExcludedIndices,
  };

  // Billing eligibility check (R13, T17, T19)
  let costEstimateInr: string | null = null;
  const isCostVerified = Boolean(
    options.allBillingEvidenceApproved &&
    allChannelsUnitKnown &&
    hasAnyKnownUsage
  );

  let billingNotice: string | null = null;
  if (!isCostVerified) {
    if (options.testTariffInrPerKwh && hasAnyKnownUsage) {
      // Test tariff estimate (T17: ₹8/kWh -> estimate ₹2.00)
      const cost = totalUsageKwhNum * options.testTariffInrPerKwh;
      costEstimateInr = cost.toFixed(2);
      billingNotice = 'PREVIEW TEST TARIFF ONLY: Uncertified estimate for test acceptance. Verified utility billing remains disabled.';
    } else {
      costEstimateInr = null;
      billingNotice = 'Verified billing calculation suppressed: ESP32 raw legacy packets supply cumulative energy as uncalibrated tokens without verified tariff approval or calibration evidence.';
    }
  } else if (options.testTariffInrPerKwh) {
    const cost = totalUsageKwhNum * options.testTariffInrPerKwh;
    costEstimateInr = cost.toFixed(2);
  }

  const totals: ReportTotals = {
    totalUsageKwh: hasAnyKnownUsage ? String(Number(totalUsageKwhNum.toFixed(4))) : null,
    costEstimateInr,
    isCostVerified,
    billingSuppressionNotice: billingNotice,
    channels: channelSummaries,
  };

  const status = !allChannelsUnitKnown
    ? 'unverified_units'
    : allGaps.length > 0 || allExcludedIndices.length > 0
    ? 'preliminary'
    : 'final';

  return {
    id: crypto.randomUUID(),
    siteId: options.siteId,
    deviceId: options.deviceId,
    periodStart: fromUtc,
    periodEnd: toUtc,
    timezone,
    cutoff,
    configVersion: 1,
    tariffVersion: null,
    revision: existingRevision,
    coverage: overallCoverage,
    totals,
    status,
    generatedAt: new Date().toISOString(),
  };
}
