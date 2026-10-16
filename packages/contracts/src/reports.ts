import { z } from 'zod';

export const ReportPeriodTypeSchema = z.enum(['daily', 'monthly']);
export type ReportPeriodType = z.infer<typeof ReportPeriodTypeSchema>;

export const ReportStatusSchema = z.enum([
  'preliminary',
  'final',
  'amended',
  'unverified_units',
]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const GapIntervalSchema = z.object({
  from: z.string(),
  to: z.string(),
  durationSeconds: z.number(),
  reason: z.string(),
});
export type GapInterval = z.infer<typeof GapIntervalSchema>;

export const ReportCoverageSchema = z.object({
  expectedSampleCount: z.number(),
  receivedSampleCount: z.number(),
  timeCoveredFraction: z.number(),
  boundaryQuality: z.enum(['complete', 'missing_start', 'missing_end', 'incomplete']),
  gaps: z.array(GapIntervalSchema),
  excludedIntervalIndices: z.array(z.number()),
});
export type ReportCoverage = z.infer<typeof ReportCoverageSchema>;

export const ChannelReportSummarySchema = z.object({
  channelId: z.string(),
  displaySlot: z.number().nullable(),
  label: z.string(),
  startCounter: z.string().nullable(),
  endCounter: z.string().nullable(),
  usageKwh: z.string().nullable(),
  isEstimated: z.boolean(),
  coverage: ReportCoverageSchema,
  unit: z.string(),
});
export type ChannelReportSummary = z.infer<typeof ChannelReportSummarySchema>;

export const ReportTotalsSchema = z.object({
  totalUsageKwh: z.string().nullable(),
  costEstimateInr: z.string().nullable(),
  isCostVerified: z.boolean(),
  billingSuppressionNotice: z.string().nullable(),
  channels: z.record(z.string(), ChannelReportSummarySchema),
});
export type ReportTotals = z.infer<typeof ReportTotalsSchema>;

export const ReportRecordSchema = z.object({
  id: z.string().uuid(),
  siteId: z.string().uuid(),
  deviceId: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  timezone: z.string(),
  cutoff: z.string(),
  configVersion: z.number(),
  tariffVersion: z.string().uuid().nullable(),
  revision: z.number(),
  coverage: ReportCoverageSchema,
  totals: ReportTotalsSchema,
  status: ReportStatusSchema,
  generatedAt: z.string(),
});
export type ReportRecord = z.infer<typeof ReportRecordSchema>;
