import { z } from 'zod';
import { TelemetryPayloadSchema } from './telemetry.js';

export const ChannelFreshnessSchema = z.enum([
  'fresh',
  'stale',
  'offline_inferred',
  'unconfigured',
  'unseen',
]);
export type ChannelFreshness = z.infer<typeof ChannelFreshnessSchema>;

export const DisplaySlotSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.null(),
]);
export type DisplaySlot = z.infer<typeof DisplaySlotSchema>;

export const SnapshotChannelSchema = z.object({
  rawChannelId: z.string().min(1),
  displaySlot: DisplaySlotSchema,
  label: z.string().min(1),
  lastSample: TelemetryPayloadSchema.nullable(),
  lastReceivedAt: z.string().datetime().nullable(),
  freshness: ChannelFreshnessSchema,
});
export type SnapshotChannel = z.infer<typeof SnapshotChannelSchema>;

export const SystemHealthSchema = z.object({
  process: z.enum(['healthy', 'degraded']),
  broker: z.enum(['connected', 'disconnected', 'subscribing']),
  brokerSubscribed: z.boolean(),
  database: z.enum(['healthy', 'degraded']),
  persistenceLagMs: z.number().nonnegative(),
});
export type SystemHealth = z.infer<typeof SystemHealthSchema>;

export const SystemCoverageSchema = z.object({
  configuredSlots: z.number().int().min(0).max(5),
  reportingSlots: z.number().int().min(0).max(5),
  partial: z.boolean(),
});
export type SystemCoverage = z.infer<typeof SystemCoverageSchema>;

export const SnapshotPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  requestId: z.string().min(1),
  selectionGeneration: z.number().int().nonnegative(),
  serverEpoch: z.string().uuid(),
  cursor: z.string().regex(/^[0-9]+$/),
  serverNow: z.string().datetime(),
  siteId: z.string().min(1),
  deviceId: z.string().min(1),
  mappingVersion: z.number().int().positive(),
  channels: z.array(SnapshotChannelSchema),
  health: SystemHealthSchema,
  coverage: SystemCoverageSchema,
});
export type SnapshotPayload = z.infer<typeof SnapshotPayloadSchema>;
