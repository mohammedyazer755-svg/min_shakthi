import { z } from 'zod';
import { TelemetryPayloadSchema } from './telemetry.js';
import { SnapshotPayloadSchema } from './snapshot.js';

export const DeviceSubscribeSchema = z.object({
  requestId: z.string().min(1),
  selectionGeneration: z.number().int().nonnegative(),
  siteId: z.string().min(1),
  deviceId: z.string().min(1),
});
export type DeviceSubscribePayload = z.infer<typeof DeviceSubscribeSchema>;

export const DisplayAckSchema = z.object({
  requestId: z.string().min(1),
  eventId: z.string().uuid(),
  clientReceivedAtMs: z.number().nonnegative(),
  renderCompleteAtMs: z.number().nonnegative(),
});
export type DisplayAckPayload = z.infer<typeof DisplayAckSchema>;

export const SocketAuthHandshakeSchema = z.object({
  token: z.string().min(1),
});
export type SocketAuthHandshake = z.infer<typeof SocketAuthHandshakeSchema>;

export interface ServerToClientEvents {
  'state:snapshot': (snapshot: z.infer<typeof SnapshotPayloadSchema>) => void;
  'telemetry:update': (payload: z.infer<typeof TelemetryPayloadSchema>) => void;
  'system:status': (status: {
    timestamp: string;
    serverEpoch: string;
    broker: string;
    subscribed: boolean;
    database: string;
  }) => void;
  'auth:expired': () => void;
  'resync:required': (reason: string) => void;
}

export interface ClientToServerEvents {
  'device:subscribe': (
    payload: DeviceSubscribePayload,
    callback?: (ack: { status: 'ok' | 'error'; error?: string }) => void
  ) => void;
  'display:ack': (payload: DisplayAckPayload) => void;
}
