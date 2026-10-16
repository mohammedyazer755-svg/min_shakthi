import { z } from 'zod';

export const DeviceIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, 'DeviceId must start with alphanumeric and contain only ASCII letters, digits, underscores, or hyphens');

export const ChannelIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, 'ChannelId must start with alphanumeric and contain only ASCII letters, digits, underscores, or hyphens');

export interface CompositeChannelKey {
  deviceId: string;
  channelId: string;
}

const SEPARATOR = '::';

/**
 * Creates a collision-safe composite identity string for deviceId + channelId.
 * e.g., 'prototype1::channel1'
 */
export function toCompositeChannelKey(deviceId: string, channelId: string): string {
  DeviceIdSchema.parse(deviceId);
  ChannelIdSchema.parse(channelId);
  return `${deviceId}${SEPARATOR}${channelId}`;
}

/**
 * Parses a composite identity string into deviceId and channelId.
 */
export function parseCompositeChannelKey(key: string): CompositeChannelKey {
  const parts = key.split(SEPARATOR);
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid composite channel key format: "${key}". Expected "deviceId${SEPARATOR}channelId".`);
  }
  return {
    deviceId: DeviceIdSchema.parse(parts[0]),
    channelId: ChannelIdSchema.parse(parts[1]),
  };
}

export interface DeviceChannelMapping {
  rawChannelId: string;
  displaySlot: 1 | 2 | 3 | 4 | 5 | null;
  label: string;
  enabled: boolean;
}

/**
 * Validates that channel mappings for a single device are valid:
 * 1. Each rawChannelId is unique within the device.
 * 2. Each non-null displaySlot (1..5) is unique within the device.
 */
export function validateDeviceMappings(mappings: DeviceChannelMapping[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const rawSeen = new Set<string>();
  const slotSeen = new Set<number>();

  for (const m of mappings) {
    if (rawSeen.has(m.rawChannelId)) {
      errors.push(`Duplicate rawChannelId "${m.rawChannelId}" configured for device.`);
    }
    rawSeen.add(m.rawChannelId);

    if (m.displaySlot !== null) {
      if (m.displaySlot < 1 || m.displaySlot > 5) {
        errors.push(`Invalid displaySlot "${m.displaySlot}". Must be between 1 and 5.`);
      } else if (slotSeen.has(m.displaySlot)) {
        errors.push(`Duplicate displaySlot CH0${m.displaySlot} assigned to multiple channels on same device.`);
      } else {
        slotSeen.add(m.displaySlot);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
