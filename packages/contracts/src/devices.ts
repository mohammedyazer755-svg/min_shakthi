import { z } from 'zod';

export const ChannelMappingItemSchema = z.object({
  channelId: z.string(), // rawChannelId e.g. 'channel1'
  displaySlot: z.number().int().min(1).max(5).nullable(),
  label: z.string().min(1).max(255),
  enabled: z.boolean().default(true),
});
export type ChannelMappingItem = z.infer<typeof ChannelMappingItemSchema>;

export const UpdateDeviceMappingRequestSchema = z.object({
  expectedConfigVersion: z.number().int().min(1),
  mappings: z.array(ChannelMappingItemSchema),
});
export type UpdateDeviceMappingRequest = z.infer<typeof UpdateDeviceMappingRequestSchema>;

export const DeviceDiagnosticsSchema = z.object({
  deviceId: z.string(),
  rawDeviceId: z.string(),
  siteId: z.string(),
  enabled: z.boolean(),
  expectedIntervalMs: z.number(),
  configVersion: z.number(),
  brokerStatus: z.string(),
  lastReceivedAt: z.string().nullable(),
  totalPacketsReceived: z.number(),
  quarantineCount: z.number(),
  intervalJitterMs: z.number().nullable(),
  channels: z.array(
    z.object({
      rawChannelId: z.string(),
      displaySlot: z.number().nullable(),
      label: z.string(),
      enabled: z.boolean(),
      freshness: z.string(),
      lastSeenAt: z.string().nullable(),
    })
  ),
});
export type DeviceDiagnostics = z.infer<typeof DeviceDiagnosticsSchema>;
