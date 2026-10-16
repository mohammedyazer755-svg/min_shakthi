import { z } from 'zod';

export const AlertMetricSchema = z.enum(['voltage', 'current', 'power', 'frequency']);
export type AlertMetric = z.infer<typeof AlertMetricSchema>;

export const AlertOperatorSchema = z.enum(['gt', 'lt', 'gte', 'lte']);
export type AlertOperator = z.infer<typeof AlertOperatorSchema>;

export const AlertSeveritySchema = z.enum(['critical', 'warning', 'info']);
export type AlertSeverity = z.infer<typeof AlertSeveritySchema>;

export const AlertStateSchema = z.enum(['open', 'acknowledged', 'resolved']);
export type AlertState = z.infer<typeof AlertStateSchema>;

export const AlertRuleSchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  deviceId: z.string(),
  channelId: z.string().nullable().optional(),
  metric: AlertMetricSchema,
  operator: AlertOperatorSchema,
  threshold: z.number(),
  hysteresis: z.number().default(0),
  debounceMs: z.number().default(0),
  severity: AlertSeveritySchema,
  enabled: z.boolean().default(true),
  version: z.number().default(1),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type AlertRule = z.infer<typeof AlertRuleSchema>;

export const AlertAcknowledgementSchema = z.object({
  id: z.string().uuid(),
  alertId: z.string().uuid(),
  userId: z.string().uuid(),
  userDisplayName: z.string().optional(),
  ackAt: z.string(),
  note: z.string().nullable().optional(),
});
export type AlertAcknowledgement = z.infer<typeof AlertAcknowledgementSchema>;

export const AlertRecordSchema = z.object({
  id: z.string().uuid(),
  ruleId: z.string().uuid(),
  deviceId: z.string(),
  channelId: z.string().nullable(),
  openedAt: z.string(),
  resolvedAt: z.string().nullable(),
  lastSeenAt: z.string(),
  state: AlertStateSchema,
  triggerEventId: z.string().nullable(),
  triggerValue: z.number(),
  violationStartAt: z.string(),
  rule: AlertRuleSchema.optional(),
  acknowledgements: z.array(AlertAcknowledgementSchema).default([]),
});
export type AlertRecord = z.infer<typeof AlertRecordSchema>;

export const EvaluationHealthSchema = z.enum(['healthy', 'paused_stale', 'delayed_outage']);
export type EvaluationHealth = z.infer<typeof EvaluationHealthSchema>;
