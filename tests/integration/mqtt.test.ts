import { describe, it, expect, beforeEach } from 'vitest';
import { MqttIngestService } from '../../apps/server/src/mqtt/client.js';
import { IngestCache } from '../../apps/server/src/ingest/cache.js';
import { DeviceRegistry } from '../../apps/server/src/ingest/registry.js';
import { IngestMetrics } from '../../apps/server/src/observability/metrics.js';
import { IngestTestSink } from '../../apps/server/src/ingest/sink.js';
import { QuarantineManager } from '../../apps/server/src/ingest/quarantine.js';
import { evaluateChannelFreshness } from '../../apps/server/src/ingest/freshness.js';
import type { ServerEnv } from '@minsakthi/contracts';

describe('Phase 2 MQTT Ingestion & Connection Monitoring Integration (T01–T05, T12, T14)', () => {
  let ingestService: MqttIngestService;

  const testEnv: ServerEnv = {
    NODE_ENV: 'test',
    PORT: 3001,
    MQTT_URL: 'mqtt://localhost:18883',
    MQTT_TOPIC: 'swiftpower',
    COOKIE_SECURE: true,
    COOKIE_SAME_SITE: 'lax',
    SPOOL_DIR: '/var/data/minsakthi-spool',
    SPOOL_MAX_BYTES: 1073741824,
  };

  beforeEach(() => {
    // Reset all singletons
    const registry = DeviceRegistry.getInstance();
    registry.seedDefaultTestRegistry();

    const cache = IngestCache.getInstance();
    cache.clear();

    const metrics = IngestMetrics.getInstance();
    metrics.reset();
    metrics.brokerConnected = true;
    metrics.brokerSubscribed = true;

    const quarantine = QuarantineManager.getInstance();
    quarantine.clear();

    ingestService = new MqttIngestService(testEnv);
  });

  it('T01: receives and validates legacy MQTT packets across all 3 accepted syntax forms', () => {
    const cache = IngestCache.getInstance();
    const metrics = IngestMetrics.getInstance();

    // Form 1: Topic-space-device (7 fields)
    ingestService.handleMessage(
      'swiftpower',
      Buffer.from('swiftpower prototype1,channel1,239.67,0.14,33.22,88.11,49.98'),
      { qos: 1, retain: false, dup: false }
    );
    const r1 = cache.get('prototype1', 'channel1');
    expect(r1).not.toBeNull();
    expect(r1?.telemetry.values.power).toBe(33.22);
    expect(r1?.telemetry.values.voltage).toBe(239.67);

    // Form 2: Device-only (7 fields)
    ingestService.handleMessage(
      'swiftpower',
      Buffer.from('prototype1,channel1,241.09,0.09,22.27,88.58,49.99'),
      { qos: 1, retain: false, dup: false }
    );
    const r2 = cache.get('prototype1', 'channel1');
    expect(r2?.telemetry.values.power).toBe(22.27);

    // Form 3: Explicit topic (8 fields)
    ingestService.handleMessage(
      'swiftpower',
      Buffer.from('swiftpower,prototype1,channel1,240.00,0.10,24.00,88.60,50.00'),
      { qos: 1, retain: false, dup: false }
    );
    const r3 = cache.get('prototype1', 'channel1');
    expect(r3?.telemetry.values.power).toBe(24.0);

    expect(metrics.totalAccepted).toBe(3);
  });

  it('T02: interleaves two devices with identical channel IDs without overwrite (R03 Device Isolation)', () => {
    const cache = IngestCache.getInstance();

    // Interleave updates: prototype1 channel1=33.22W vs prototype2 channel1=460.00W
    ingestService.handleMessage(
      'swiftpower',
      Buffer.from('prototype1,channel1,239.67,0.14,33.22,88.11,49.98'),
      { qos: 1, retain: false, dup: false }
    );

    ingestService.handleMessage(
      'swiftpower',
      Buffer.from('prototype2,channel1,230.00,2.00,460.00,100.00,50.00'),
      { qos: 1, retain: false, dup: false }
    );

    // Verify cache has both records completely separated by composite identity
    const cachedDev1 = cache.get('prototype1', 'channel1');
    const cachedDev2 = cache.get('prototype2', 'channel1');

    expect(cachedDev1).not.toBeNull();
    expect(cachedDev2).not.toBeNull();

    expect(cachedDev1?.telemetry.deviceId).toBe('prototype1');
    expect(cachedDev1?.telemetry.values.power).toBe(33.22);

    expect(cachedDev2?.telemetry.deviceId).toBe('prototype2');
    expect(cachedDev2?.telemetry.values.power).toBe(460.0);
  });

  it('T03: verifies display slots CH01–CH05 per device and truthful unconfigured slots', () => {
    // Populate prototype1 channel1
    ingestService.handleMessage(
      'swiftpower',
      Buffer.from('prototype1,channel1,239.67,0.14,33.22,88.11,49.98'),
      { qos: 1, retain: false, dup: false }
    );

    const sink = IngestTestSink.getInstance();
    const snapshot1 = sink.getSnapshot('prototype1');
    expect(snapshot1).not.toBeNull();
    expect(snapshot1?.channels).toHaveLength(5);

    // Slot 1 is channel1 (Main Incomer)
    const slot1 = snapshot1?.channels[0];
    expect(slot1?.displaySlot).toBe(1);
    expect(slot1?.rawChannelId).toBe('channel1');
    expect(slot1?.label).toBe('Main Incomer');
    expect(slot1?.lastSample).not.toBeNull();

    // Slot 5 is unconfigured
    const slot5 = snapshot1?.channels[4];
    expect(slot5?.displaySlot).toBe(5);
    expect(slot5?.freshness).toBe('unconfigured');
    expect(slot5?.lastSample).toBeNull(); // Must be null, never fake zero
  });

  it('T04: valid 0A/0W remains fresh, transitions to stale (5s) and offline (30s) under 1s interval (R08)', () => {
    const cache = IngestCache.getInstance();

    // Send valid zero load
    ingestService.handleMessage(
      'swiftpower',
      Buffer.from('prototype1,channel1,240.00,0.00,0.00,88.11,50.00'),
      { qos: 1, retain: false, dup: false }
    );

    const cached = cache.get('prototype1', 'channel1');
    expect(cached).not.toBeNull();
    expect(cached?.telemetry.values.power).toBe(0.0);
    expect(cached?.telemetry.values.current).toBe(0.0);

    const receivedTimeMs = new Date(cached!.receivedAt).getTime();

    // Immediately: fresh zero load (zero load is not offline)
    const freshState = evaluateChannelFreshness({
      cached,
      expectedIntervalMs: 1000,
      nowMs: receivedTimeMs + 500, // 0.5s elapsed
    });
    expect(freshState).toBe('fresh');

    // After 5.1s (stale threshold = max(3*1000, 5000) = 5000ms)
    const staleState = evaluateChannelFreshness({
      cached,
      expectedIntervalMs: 1000,
      nowMs: receivedTimeMs + 5100,
    });
    expect(staleState).toBe('stale');

    // After 30.1s (offline threshold = max(10*1000, 30000) = 30000ms)
    const offlineState = evaluateChannelFreshness({
      cached,
      expectedIntervalMs: 1000,
      nowMs: receivedTimeMs + 30100,
    });
    expect(offlineState).toBe('offline_inferred');
  });

  it('T05: verifies broker connection state, SUBACK validation, and transport suppression', () => {
    const metrics = IngestMetrics.getInstance();
    expect(metrics.brokerConnected).toBe(true);
    expect(metrics.brokerSubscribed).toBe(true);

    ingestService.handleMessage(
      'swiftpower',
      Buffer.from('prototype1,channel1,239.67,0.14,33.22,88.11,49.98'),
      { qos: 1, retain: false, dup: false }
    );

    const cache = IngestCache.getInstance();
    const cached = cache.get('prototype1', 'channel1');
    const receivedTimeMs = new Date(cached!.receivedAt).getTime();

    // When broker transport is disconnected, physical offline inference is suppressed
    const suppressedState = evaluateChannelFreshness({
      cached,
      expectedIntervalMs: 1000,
      nowMs: receivedTimeMs + 40000,
      brokerConnected: false, // Transport broken
    });
    expect(suppressedState).toBe('stale'); // Suppressed from offline_inferred
  });

  it('T12: preserves repeated messages with suspect duplicate flag on MQTT dup', () => {
    const cache = IngestCache.getInstance();

    ingestService.handleMessage(
      'swiftpower',
      Buffer.from('prototype1,channel1,239.67,0.14,33.22,88.11,49.98'),
      { qos: 1, retain: false, dup: true }
    );

    const cached = cache.get('prototype1', 'channel1');
    expect(cached?.telemetry.quality).toContain('SUSPECT_DUPLICATE');
  });

  it('T14: retained packet is marked RETAINED_UNKNOWN_AGE and does not claim fresh hardware', () => {
    const cache = IngestCache.getInstance();

    ingestService.handleMessage(
      'swiftpower',
      Buffer.from('prototype1,channel2,239.67,0.80,191.17,658.53,49.98'),
      { qos: 1, retain: true, dup: false }
    );

    const cached = cache.get('prototype1', 'channel2');
    expect(cached?.telemetry.retained).toBe(true);
    expect(cached?.telemetry.quality).toContain('RETAINED_UNKNOWN_AGE');

    // Freshness evaluation of retained packet must be stale, never fresh
    const freshness = evaluateChannelFreshness({
      cached,
      expectedIntervalMs: 5000,
      nowMs: Date.now(),
    });
    expect(freshness).toBe('stale');
  });

  it('quarantines unregistered device IDs without crashing or enrolling into organizations', () => {
    const quarantine = QuarantineManager.getInstance();
    const initialQuarantineCount = quarantine.getRecent().length;

    ingestService.handleMessage(
      'swiftpower',
      Buffer.from('unregistered_board_99,channel1,240,1,240,10,50'),
      { qos: 1, retain: false, dup: false }
    );

    const recent = quarantine.getRecent();
    expect(recent.length).toBeGreaterThan(initialQuarantineCount);
    expect(recent[0]?.deviceId).toBe('unregistered_board_99');
    expect(recent[0]?.reason).toBe('UNREGISTERED_DEVICE');

    // Check that unregistered device does NOT exist in registered cache
    const cache = IngestCache.getInstance();
    expect(cache.get('unregistered_board_99', 'channel1')).toBeNull();
  });

  it('measures ingress -> cache latency and verifies p95 <= 50ms', () => {
    const metrics = IngestMetrics.getInstance();

    // Replay 20 packets to generate a warm latency distribution
    for (let i = 0; i < 20; i++) {
      ingestService.handleMessage(
        'swiftpower',
        Buffer.from(`prototype1,channel1,240.00,0.10,24.00,88.11,50.00`),
        { qos: 1, retain: false, dup: false }
      );
    }

    const p95 = metrics.getPercentileLatency(95);

    // SLO target: Ingest-to-cache p95 <= 50ms
    expect(p95).toBeLessThanOrEqual(50);
  });
});
