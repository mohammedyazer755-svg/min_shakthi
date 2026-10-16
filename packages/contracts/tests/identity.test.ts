import { describe, it, expect } from 'vitest';
import {
  toCompositeChannelKey,
  parseCompositeChannelKey,
  validateDeviceMappings,
} from '../src/identity.js';

describe('Composite Identity Contracts', () => {
  it('creates distinct keys for different devices with the same channel ID (R03 isolation)', () => {
    const key1 = toCompositeChannelKey('prototype1', 'channel1');
    const key2 = toCompositeChannelKey('prototype2', 'channel1');

    expect(key1).not.toBe(key2);
    expect(key1).toBe('prototype1::channel1');
    expect(key2).toBe('prototype2::channel1');
  });

  it('correctly parses valid composite keys back into deviceId and channelId', () => {
    const key = toCompositeChannelKey('prototype1', 'channel2');
    const parsed = parseCompositeChannelKey(key);

    expect(parsed.deviceId).toBe('prototype1');
    expect(parsed.channelId).toBe('channel2');
  });

  it('rejects invalid or malformed composite keys', () => {
    expect(() => parseCompositeChannelKey('singletoken')).toThrow();
    expect(() => parseCompositeChannelKey('::channel1')).toThrow();
    expect(() => parseCompositeChannelKey('prototype1::')).toThrow();
    expect(() => parseCompositeChannelKey('proto::chan::extra')).toThrow();
  });

  it('validates per-device channel mapping: rejects duplicate display slots within one device (R04)', () => {
    const validMappings = [
      { rawChannelId: 'channel1', displaySlot: 1 as const, label: 'Main Incomer', enabled: true },
      { rawChannelId: 'channel2', displaySlot: 2 as const, label: 'HVAC', enabled: true },
      { rawChannelId: 'channel3', displaySlot: null, label: 'Spares', enabled: false },
    ];
    const checkValid = validateDeviceMappings(validMappings);
    expect(checkValid.valid).toBe(true);
    expect(checkValid.errors).toHaveLength(0);

    const duplicateSlotMappings = [
      { rawChannelId: 'channel1', displaySlot: 1 as const, label: 'Main Incomer', enabled: true },
      { rawChannelId: 'channel2', displaySlot: 1 as const, label: 'HVAC', enabled: true }, // DUPLICATE SLOT
    ];
    const checkDuplicate = validateDeviceMappings(duplicateSlotMappings);
    expect(checkDuplicate.valid).toBe(false);
    expect(checkDuplicate.errors[0]).toContain('Duplicate displaySlot CH01');
  });

  it('allows same display slot across DIFFERENT devices (per-device mapping contract)', () => {
    // Device 1 mapping
    const dev1 = validateDeviceMappings([
      { rawChannelId: 'channel1', displaySlot: 1, label: 'Board 1 Main', enabled: true },
    ]);
    // Device 2 mapping
    const dev2 = validateDeviceMappings([
      { rawChannelId: 'channel0', displaySlot: 1, label: 'Board 2 Feeder', enabled: true },
    ]);

    expect(dev1.valid).toBe(true);
    expect(dev2.valid).toBe(true);
  });
});
