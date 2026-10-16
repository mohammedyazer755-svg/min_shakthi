import crypto from 'node:crypto';

export interface QuarantinedPacket {
  id: string;
  receivedAt: string;
  deviceId: string;
  channelId: string;
  reason: 'UNREGISTERED_DEVICE' | 'UNMAPPED_CHANNEL';
  rawSnippet: string;
}

export class QuarantineManager {
  private static instance: QuarantineManager;
  private readonly buffer: QuarantinedPacket[] = [];
  private readonly maxCapacity = 100;

  private constructor() {}

  public static getInstance(): QuarantineManager {
    if (!QuarantineManager.instance) {
      QuarantineManager.instance = new QuarantineManager();
    }
    return QuarantineManager.instance;
  }

  public record(params: {
    deviceId: string;
    channelId: string;
    reason: 'UNREGISTERED_DEVICE' | 'UNMAPPED_CHANNEL';
    rawPayload: string;
  }): QuarantinedPacket {
    const packet: QuarantinedPacket = {
      id: crypto.randomUUID(),
      receivedAt: new Date().toISOString(),
      deviceId: params.deviceId,
      channelId: params.channelId,
      reason: params.reason,
      rawSnippet: params.rawPayload.slice(0, 64).replace(/[\r\n]/g, ' '),
    };

    this.buffer.unshift(packet);
    if (this.buffer.length > this.maxCapacity) {
      this.buffer.pop();
    }

    return packet;
  }

  public getRecent(limit = 20): QuarantinedPacket[] {
    return this.buffer.slice(0, limit);
  }

  public clear(): void {
    this.buffer.length = 0;
  }
}
