import { z } from 'zod';
import { AlertSeveritySchema } from './alerts.js';

export const IncidentTypeSchema = z.enum([
  'electrical_breach',
  'device_interruption',
  'transport_outage',
]);
export type IncidentType = z.infer<typeof IncidentTypeSchema>;

export const IncidentStateSchema = z.enum([
  'evaluating',
  'resolved',
  'acknowledged',
]);
export type IncidentState = z.infer<typeof IncidentStateSchema>;

export const IncidentCauseConfirmationSchema = z.enum([
  'electrical_breach',
  'device_silence_unconfirmed',
  'transport_interruption',
]);
export type IncidentCauseConfirmation = z.infer<typeof IncidentCauseConfirmationSchema>;

export const IncidentGapSchema = z.object({
  startAt: z.string(),
  endAt: z.string().nullable().optional(),
  durationMs: z.number().nullable().optional(),
  reason: z.string().optional(),
});
export type IncidentGap = z.infer<typeof IncidentGapSchema>;

export const IncidentExtremaSchema = z.object({
  minVoltage: z.number().optional(),
  maxVoltage: z.number().optional(),
  maxCurrent: z.number().optional(),
  maxPower: z.number().optional(),
  minFrequency: z.number().optional(),
  maxFrequency: z.number().optional(),
});
export type IncidentExtrema = z.infer<typeof IncidentExtremaSchema>;

export const IncidentSamplePointSchema = z.object({
  timestamp: z.string(),
  voltage: z.number().nullable(),
  current: z.number().nullable(),
  power: z.number().nullable(),
  frequency: z.number().nullable(),
  energyRaw: z.string().optional(),
  channelId: z.string(),
  phase: z.enum(['before', 'during', 'after']),
  eventId: z.string().optional(),
});
export type IncidentSamplePoint = z.infer<typeof IncidentSamplePointSchema>;

export const IncidentRuleSnapshotSchema = z.object({
  ruleId: z.string(),
  metric: z.string(),
  operator: z.string(),
  threshold: z.number(),
  hysteresis: z.number(),
  debounceMs: z.number(),
  version: z.number(),
});
export type IncidentRuleSnapshot = z.infer<typeof IncidentRuleSnapshotSchema>;

export const IncidentEvidenceSchema = z.object({
  windowBeforeMs: z.number().default(120000), // Default 2 minutes
  windowAfterMs: z.number().default(120000),  // Default 2 minutes
  detectionTime: z.string(),
  recoveryTime: z.string().nullable().optional(),
  lastReceivedAt: z.string().nullable().optional(),
  channelLabel: z.string().nullable().optional(),
  ruleSnapshot: IncidentRuleSnapshotSchema.nullable().optional(),
  mappingVersion: z.number().nullable().optional(),
  transportHealth: z.object({
    brokerConnected: z.boolean(),
    brokerSubscribed: z.boolean(),
    workerEpoch: z.string().optional(),
  }),
  gaps: z.array(IncidentGapSchema).default([]),
  extrema: IncidentExtremaSchema.default({}),
  samples: z.array(IncidentSamplePointSchema).default([]),
  sourceEventIds: z.array(z.string()).default([]),
});
export type IncidentEvidence = z.infer<typeof IncidentEvidenceSchema>;

export const IncidentAcknowledgementSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  userId: z.string().uuid(),
  userDisplayName: z.string().optional(),
  ackAt: z.string(),
  note: z.string().nullable().optional(),
});
export type IncidentAcknowledgement = z.infer<typeof IncidentAcknowledgementSchema>;

export const IncidentRecordSchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  deviceId: z.string(),
  channelId: z.string().nullable(),
  type: IncidentTypeSchema,
  severity: AlertSeveritySchema,
  state: IncidentStateSchema,
  title: z.string(),
  summary: z.string(),
  causeConfirmation: IncidentCauseConfirmationSchema,
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  durationMs: z.number().nullable(),
  evidence: IncidentEvidenceSchema,
  acknowledgements: z.array(IncidentAcknowledgementSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type IncidentRecord = z.infer<typeof IncidentRecordSchema>;
