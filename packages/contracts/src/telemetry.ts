import { z } from 'zod';

export const TelemetryValuesSchema = z.object({
  voltage: z.number().finite().nonnegative('Voltage cannot be negative in scalar contract'),
  current: z.number().finite().nonnegative('Current cannot be negative in scalar contract'),
  power: z.number().finite(),
  energyRaw: z.string().regex(/^[+-]?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/, 'Invalid energyRaw decimal string'),
  frequency: z.number().finite().nonnegative('Frequency cannot be negative in scalar contract'),
});

export type TelemetryValues = z.infer<typeof TelemetryValuesSchema>;

export const QualityFlagSchema = z.enum([
  'SIGNED_FLOW_UNVERIFIED',
  'SENSOR_RANGE',
  'SUSPECT_DUPLICATE',
  'COUNTER_DISCONTINUITY',
  'RETAINED_UNKNOWN_AGE',
]);

export type QualityFlag = z.infer<typeof QualityFlagSchema>;

export const PersistenceStatusSchema = z.enum(['pending', 'durable', 'committed']);
export type PersistenceStatus = z.infer<typeof PersistenceStatusSchema>;

export const EnergyUnitSchema = z.enum(['unknown', 'Wh', 'kWh']);
export type EnergyUnit = z.infer<typeof EnergyUnitSchema>;

export const TelemetryPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  eventId: z.string().uuid(),
  serverEpoch: z.string().uuid(),
  sequence: z.string().regex(/^[0-9]+$/, 'Sequence must be a decimal string'),
  siteId: z.string().min(1),
  deviceId: z.string().min(1).max(64),
  channelId: z.string().min(1).max(64),
  receivedAt: z.string().datetime(),
  deviceTimestamp: z.null(),
  values: TelemetryValuesSchema,
  energyUnit: EnergyUnitSchema.default('unknown'),
  quality: z.array(QualityFlagSchema).default([]),
  retained: z.boolean().default(false),
  persistence: PersistenceStatusSchema.default('pending'),
});

export type TelemetryPayload = z.infer<typeof TelemetryPayloadSchema>;
