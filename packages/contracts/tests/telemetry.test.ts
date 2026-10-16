import { describe, it, expect } from 'vitest';
import { TelemetryPayloadSchema } from '../src/telemetry.js';

describe('Telemetry Payload Schema Contracts', () => {
  const validPayload = {
    schemaVersion: 1 as const,
    eventId: '11111111-1111-4111-8111-111111111111',
    serverEpoch: '22222222-2222-4222-8222-222222222222',
    sequence: '1001',
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
    persistence: 'pending' as const,
  };

  it('validates a standard conformant telemetry payload', () => {
    const res = TelemetryPayloadSchema.safeParse(validPayload);
    expect(res.success).toBe(true);
  });

  it('validates valid zero load readings (zero is a valid measurement, R08)', () => {
    const zeroPayload = {
      ...validPayload,
      values: {
        voltage: 240.0,
        current: 0.0,
        power: 0.0,
        energyRaw: '88.11',
        frequency: 50.0,
      },
    };
    const res = TelemetryPayloadSchema.safeParse(zeroPayload);
    expect(res.success).toBe(true);
  });

  it('strictly rejects negative voltage in scalar contract', () => {
    const invalid = {
      ...validPayload,
      values: {
        ...validPayload.values,
        voltage: -240.0,
      },
    };
    const res = TelemetryPayloadSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it('strictly rejects non-decimal energyRaw strings', () => {
    const invalid = {
      ...validPayload,
      values: {
        ...validPayload.values,
        energyRaw: '88.11kWh', // unit suffixes strictly forbidden in raw decimal
      },
    };
    const res = TelemetryPayloadSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it('strictly enforces schemaVersion 1', () => {
    const invalid = {
      ...validPayload,
      schemaVersion: 2,
    };
    const res = TelemetryPayloadSchema.safeParse(invalid);
    expect(res.success).toBe(false);
  });
});
