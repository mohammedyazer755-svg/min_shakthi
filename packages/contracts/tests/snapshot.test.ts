import { describe, it, expect } from 'vitest';
import { SnapshotPayloadSchema } from '../src/snapshot.js';

describe('Snapshot Payload Schema Contracts', () => {
  const validSnapshot = {
    schemaVersion: 1 as const,
    requestId: 'req_12345',
    selectionGeneration: 1,
    serverEpoch: '22222222-2222-4222-8222-222222222222',
    cursor: '1005',
    serverNow: '2026-10-16T15:00:01.000Z',
    siteId: 'site_alpha',
    deviceId: 'prototype1',
    mappingVersion: 1,
    channels: [
      {
        rawChannelId: 'channel1',
        displaySlot: 1 as const,
        label: 'Main Branch',
        lastSample: {
          schemaVersion: 1 as const,
          eventId: '11111111-1111-4111-8111-111111111111',
          serverEpoch: '22222222-2222-4222-8222-222222222222',
          sequence: '1005',
          siteId: 'site_alpha',
          deviceId: 'prototype1',
          channelId: 'channel1',
          receivedAt: '2026-10-16T15:00:00.000Z',
          deviceTimestamp: null,
          values: {
            voltage: 239.67,
            current: 0.14,
            power: 33.22,
            energyRaw: '88.11',
            frequency: 49.98,
          },
          energyUnit: 'unknown' as const,
          quality: [],
          retained: false,
          persistence: 'committed' as const,
        },
        lastReceivedAt: '2026-10-16T15:00:00.000Z',
        freshness: 'fresh' as const,
      },
      {
        rawChannelId: 'channel2',
        displaySlot: 2 as const,
        label: 'HVAC',
        lastSample: null, // Null for unseen, never fake zeros
        lastReceivedAt: null,
        freshness: 'unseen' as const,
      },
      {
        rawChannelId: 'unconfigured_3',
        displaySlot: null,
        label: 'Slot 3',
        lastSample: null,
        lastReceivedAt: null,
        freshness: 'unconfigured' as const,
      },
    ],
    health: {
      process: 'healthy' as const,
      broker: 'connected' as const,
      brokerSubscribed: true,
      database: 'healthy' as const,
      persistenceLagMs: 12,
    },
    coverage: {
      configuredSlots: 2,
      reportingSlots: 1,
      partial: true,
    },
  };

  it('validates a complete, truthful snapshot payload', () => {
    const res = SnapshotPayloadSchema.safeParse(validSnapshot);
    expect(res.success).toBe(true);
  });

  it('allows null lastSample and null lastReceivedAt for unconfigured/unseen channels', () => {
    const channel = validSnapshot.channels[1];
    expect(channel?.lastSample).toBeNull();
    expect(channel?.lastReceivedAt).toBeNull();
  });
});
