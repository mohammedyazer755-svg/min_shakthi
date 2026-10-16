import type { ChannelFreshness } from '@minsakthi/contracts';
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

  if (!isConfigured) {
    return 'unconfigured';
  }

  if (!cached || !cached.telemetry) {
    return 'unseen';
  }

  // Retained messages are evidence of unknown age; they never make a channel fresh
  if (cached.isRetained) {
    return 'stale';
  }

  const receivedAtMs = new Date(cached.receivedAt).getTime();
  const elapsedMs = Math.max(0, nowMs - receivedAtMs);

  const staleThresholdMs = Math.max(3 * expectedIntervalMs, 5000);
  const offlineThresholdMs = Math.max(10 * expectedIntervalMs, 30000);

  if (elapsedMs <= staleThresholdMs) {
    return 'fresh';
  }

  if (elapsedMs <= offlineThresholdMs) {
    return 'stale';
  }

  // If elapsedMs > offlineThresholdMs:
  // If upstream transport is broken, suppress physical offline inference
  if (!brokerConnected) {
    return 'stale';
  }

  return 'offline_inferred';
}
