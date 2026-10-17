import { readingFreshness, type ChannelFreshness } from '@minsakthi/contracts';
import type { CachedTelemetry } from './cache.js';

export interface FreshnessEvaluationParams {
  cached: CachedTelemetry | null;
  expectedIntervalMs: number;
  nowMs?: number;
  brokerConnected?: boolean;
  isConfigured?: boolean;
}

export function evaluateChannelFreshness(params: FreshnessEvaluationParams): ChannelFreshness {
  const {
    cached,
    expectedIntervalMs,
    nowMs = Date.now(),
    brokerConnected = true,
    isConfigured = true,
  } = params;

  return readingFreshness({ receivedAt:cached?.receivedAt ?? null,retained:cached?.isRetained,
    suspectDuplicate:cached?.telemetry.quality.includes('SUSPECT_DUPLICATE'),
    configured:isConfigured,expectedIntervalMs,nowMs,transportAvailable:brokerConnected });
}
