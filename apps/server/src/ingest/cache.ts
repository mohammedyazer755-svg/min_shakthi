import { toCompositeChannelKey, type TelemetryPayload } from '@minsakthi/contracts';

export interface CachedTelemetry {
  telemetry: TelemetryPayload;
  receivedAt: string;
  monotonicReceivedAtMs: number;
  isRetained: boolean;
}

export class IngestCache {
  private static instance: IngestCache;
  private readonly store = new Map<string, CachedTelemetry>();

  private constructor() {}

  public static getInstance(): IngestCache {
    if (!IngestCache.instance) {
      IngestCache.instance = new IngestCache();
    }
    return IngestCache.instance;
  }

  public set(telemetry: TelemetryPayload, monotonicReceivedAtMs: number): void {
    const key = toCompositeChannelKey(telemetry.deviceId, telemetry.channelId);
    this.store.set(key, {
      telemetry,
      receivedAt: telemetry.receivedAt,
      monotonicReceivedAtMs,
      isRetained: telemetry.retained,
    });
  }

  public get(deviceId: string, channelId: string): CachedTelemetry | null {
    const key = toCompositeChannelKey(deviceId, channelId);
    return this.store.get(key) ?? null;
  }

  public getAllForDevice(deviceId: string): CachedTelemetry[] {
    const results: CachedTelemetry[] = [];
    const prefix = `${deviceId}::`;
    for (const [key, value] of this.store.entries()) {
      if (key.startsWith(prefix)) {
        results.push(value);
      }
    }
    return results;
  }

  public delete(deviceId: string, channelId: string): boolean {
    const key = toCompositeChannelKey(deviceId, channelId);
    return this.store.delete(key);
  }

  public clear(): void {
    this.store.clear();
  }
}
