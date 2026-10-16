import { EventEmitter } from 'node:events';
import crypto from 'node:crypto';
import type { TelemetryPayload, SnapshotPayload, SnapshotChannel } from '@minsakthi/contracts';
import { IngestCache } from './cache.js';
import { DeviceRegistry } from './registry.js';
import { evaluateChannelFreshness } from './freshness.js';
import { IngestMetrics } from '../observability/metrics.js';
import type { QuarantinedPacket } from './quarantine.js';

export class IngestTestSink extends EventEmitter {
  private static instance: IngestTestSink;

  private constructor() {
    super();
    this.setMaxListeners(50);
  }

  public static getInstance(): IngestTestSink {
    if (!IngestTestSink.instance) {
      IngestTestSink.instance = new IngestTestSink();
    }
    return IngestTestSink.instance;
  }

  public emitAccepted(sample: TelemetryPayload, latencyMs: number): void {
    this.emit('accepted', { sample, latencyMs });
  }

  public emitRejected(code: string, reason: string): void {
    this.emit('rejected', { code, reason });
  }

  public emitQuarantined(packet: QuarantinedPacket): void {
    this.emit('quarantined', packet);
  }

  public async waitForNextAccepted(timeoutMs = 5000): Promise<{ sample: TelemetryPayload; latencyMs: number }> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off('accepted', handler);
        reject(new Error(`Timeout (${timeoutMs}ms) waiting for next accepted telemetry sample.`));
      }, timeoutMs);

      const handler = (data: { sample: TelemetryPayload; latencyMs: number }) => {
        clearTimeout(timer);
        resolve(data);
      };

      this.once('accepted', handler);
    });
  }

  public getSnapshot(deviceId: string, requestId = crypto.randomUUID()): SnapshotPayload | null {
    const registry = DeviceRegistry.getInstance();
    const cache = IngestCache.getInstance();
    const metrics = IngestMetrics.getInstance();

    const dev = registry.getDevice(deviceId);
    if (!dev) return null;

    const channels: SnapshotChannel[] = [];
    let reportingCount = 0;

    // Slots 1 to 5
    for (let slot = 1; slot <= 5; slot++) {
      // Find mapping for this display slot
      let matchedMapping = null;
      for (const m of dev.channels.values()) {
        if (m.displaySlot === slot && m.enabled) {
          matchedMapping = m;
          break;
        }
      }

      if (matchedMapping) {
        const cached = cache.get(deviceId, matchedMapping.rawChannelId);
        const freshness = evaluateChannelFreshness({
          cached,
          expectedIntervalMs: matchedMapping.expectedIntervalMs ?? dev.expectedIntervalMs,
          brokerConnected: metrics.brokerConnected,
          isConfigured: true,
        });

        if (freshness === 'fresh') {
          reportingCount++;
        }

        channels.push({
          rawChannelId: matchedMapping.rawChannelId,
          displaySlot: slot as 1 | 2 | 3 | 4 | 5,
          label: matchedMapping.label,
          lastSample: cached?.telemetry ?? null,
          lastReceivedAt: cached?.receivedAt ?? null,
          freshness,
        });
      } else {
        channels.push({
          rawChannelId: `unconfigured_${slot}`,
          displaySlot: slot as 1 | 2 | 3 | 4 | 5,
          label: `Slot ${slot}`,
          lastSample: null,
          lastReceivedAt: null,
          freshness: 'unconfigured',
        });
      }
    }

    const configuredCount = dev.channels.size;

    return {
      schemaVersion: 1,
      requestId,
      selectionGeneration: 1,
      serverEpoch: crypto.randomUUID(),
      cursor: '0',
      serverNow: new Date().toISOString(),
      siteId: dev.siteId,
      deviceId: dev.rawDeviceId,
      mappingVersion: dev.configVersion,
      channels,
      health: {
        process: 'healthy',
        broker: metrics.brokerConnected ? 'connected' : 'disconnected',
        brokerSubscribed: metrics.brokerSubscribed,
        database: 'healthy',
        persistenceLagMs: 0,
      },
      coverage: {
        configuredSlots: Math.min(configuredCount, 5),
        reportingSlots: reportingCount,
        partial: reportingCount < configuredCount,
      },
    };
  }
}
