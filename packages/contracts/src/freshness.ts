import type { ChannelFreshness } from './snapshot.js';

export const DEFAULT_PUBLISH_INTERVAL_MS = 5000;
export const FRESHNESS_TICK_MS = 250;

export function freshnessWindows(expectedIntervalMs = DEFAULT_PUBLISH_INTERVAL_MS) {
  const interval = Number.isFinite(expectedIntervalMs) && expectedIntervalMs > 0
    ? expectedIntervalMs : DEFAULT_PUBLISH_INTERVAL_MS;
  return { staleAfterMs: Math.max(1500, interval * 1.2), offlineAfterMs: Math.max(5000, interval * 2) };
}

export function readingFreshness(options: {
  receivedAt: string | null;
  retained?: boolean;
  suspectDuplicate?: boolean;
  configured?: boolean;
  expectedIntervalMs?: number;
  nowMs: number;
  transportAvailable?: boolean;
}): ChannelFreshness {
  if (options.configured === false) return 'unconfigured';
  if (!options.receivedAt || !Number.isFinite(Date.parse(options.receivedAt))) return 'unseen';
  const age = Math.max(0, options.nowMs - Date.parse(options.receivedAt));
  const windows = freshnessWindows(options.expectedIntervalMs);
  if (age >= windows.offlineAfterMs && options.transportAvailable !== false) return 'offline_inferred';
  // Stored retained readings and a broken transport never prove that an ESP is currently sending.
  if (options.retained || options.suspectDuplicate || options.transportAvailable === false || age >= windows.staleAfterMs) return 'stale';
  return 'fresh';
}
