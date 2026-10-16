import { validateDeviceMappings, type DeviceChannelMapping } from '@minsakthi/contracts';

export interface RegisteredDevice {
  siteId: string;
  rawDeviceId: string;
  sourceNamespace: string;
  enabled: boolean;
  expectedIntervalMs: number;
  configVersion: number;
  channels: Map<string, DeviceChannelMapping>;
}

export class DeviceRegistry {
  private static instance: DeviceRegistry;
  private readonly devices = new Map<string, RegisteredDevice>();

  private constructor() {
    this.seedDefaultTestRegistry();
  }

  public static getInstance(): DeviceRegistry {
    if (!DeviceRegistry.instance) {
      DeviceRegistry.instance = new DeviceRegistry();
    }
    return DeviceRegistry.instance;
  }

  /**
   * Seeds the Phase 2 test-only registry with prototype1 and prototype2 per specification.
   */
  public seedDefaultTestRegistry(): void {
    this.devices.clear();

    // Register prototype1
    this.registerDevice({
      siteId: 'site_default',
      rawDeviceId: 'prototype1',
      sourceNamespace: 'default',
      enabled: true,
      expectedIntervalMs: 5000,
      configVersion: 1,
      mappings: [
        { rawChannelId: 'channel1', displaySlot: 1, label: 'Main Incomer', enabled: true },
        { rawChannelId: 'channel2', displaySlot: 2, label: 'HVAC Feeder', enabled: true },
      ],
    });

    // Register prototype2
    this.registerDevice({
      siteId: 'site_default',
      rawDeviceId: 'prototype2',
      sourceNamespace: 'default',
      enabled: true,
      expectedIntervalMs: 5000,
      configVersion: 1,
      mappings: [
        { rawChannelId: 'channel0', displaySlot: 1, label: 'Feeder Incomer', enabled: true },
        { rawChannelId: 'channel1', displaySlot: 2, label: 'Lighting', enabled: true },
      ],
    });
  }

  public registerDevice(params: {
    siteId: string;
    rawDeviceId: string;
    sourceNamespace: string;
    enabled: boolean;
    expectedIntervalMs: number;
    configVersion: number;
    mappings: DeviceChannelMapping[];
  }): void {
    const validation = validateDeviceMappings(params.mappings);
    if (!validation.valid) {
      throw new Error(
        `Failed to register device "${params.rawDeviceId}": ${validation.errors.join('; ')}`
      );
    }

    const channelMap = new Map<string, DeviceChannelMapping>();
    for (const m of params.mappings) {
      channelMap.set(m.rawChannelId, m);
    }

    this.devices.set(params.rawDeviceId, {
      siteId: params.siteId,
      rawDeviceId: params.rawDeviceId,
      sourceNamespace: params.sourceNamespace,
      enabled: params.enabled,
      expectedIntervalMs: params.expectedIntervalMs,
      configVersion: params.configVersion,
      channels: channelMap,
    });
  }

  public isDeviceRegistered(deviceId: string): boolean {
    const dev = this.devices.get(deviceId);
    return Boolean(dev && dev.enabled);
  }

  public getDevice(deviceId: string): RegisteredDevice | null {
    return this.devices.get(deviceId) ?? null;
  }

  public getChannelMapping(deviceId: string, channelId: string): DeviceChannelMapping | null {
    const dev = this.devices.get(deviceId);
    if (!dev || !dev.enabled) return null;
    return dev.channels.get(channelId) ?? null;
  }

  public getAllRegisteredDeviceIds(): string[] {
    return Array.from(this.devices.keys());
  }

  public clear(): void {
    this.devices.clear();
  }
}
