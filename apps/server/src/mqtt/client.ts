import mqtt, { type MqttClient } from 'mqtt';
import crypto from 'node:crypto';
import { parseLegacyMqttPacket } from '@minsakthi/protocol';
import type { TelemetryPayload } from '@minsakthi/contracts';
import type { ServerEnv } from '@minsakthi/contracts';
import { IngestCache } from '../ingest/cache.js';
import { DeviceRegistry } from '../ingest/registry.js';
import { QuarantineManager } from '../ingest/quarantine.js';
import { IngestTestSink } from '../ingest/sink.js';
import { IngestMetrics } from '../observability/metrics.js';

export class MqttIngestService {
  private client: MqttClient | null = null;
  private readonly serverEpoch = crypto.randomUUID();
  private sequence = 0n;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(private readonly env: ServerEnv) {}

  public async start(): Promise<void> {
    const clientId =
      this.env.MQTT_CLIENT_ID ||
      `minsakthi-ingest-${crypto.randomUUID().slice(0, 8)}`;

    const metrics = IngestMetrics.getInstance();

    return new Promise((resolve) => {
      this.client = mqtt.connect(this.env.MQTT_URL, {
        clientId,
        username: this.env.MQTT_USERNAME,
        password: this.env.MQTT_PASSWORD,
        clean: true, // Non-negotiable: clean start policy
        connectTimeout: 10000,
        reconnectPeriod: 1000, // Starts at 1s, capped with jitter internally
      });

      this.client.on('connect', () => {
        metrics.brokerConnected = true;

        // Subscribe to configured topic with QoS 1
        this.client?.subscribe(
          this.env.MQTT_TOPIC,
          { qos: 1 },
          (err: Error | null, granted?: Array<{ topic: string; qos: number }>) => {
            if (err) {
              metrics.brokerSubscribed = false;
              metrics.subackFailureCount += 1;
              return;
            }

            const grantedQos = granted?.[0]?.qos;
            // 128 indicates subscription failure in MQTT 3.1.1 / 5.0
            if (grantedQos === undefined || grantedQos >= 128) {
              metrics.brokerSubscribed = false;
              metrics.subackFailureCount += 1;
            } else {
              metrics.brokerSubscribed = true;
              metrics.subackSuccessCount += 1;
            }
          }
        );

        resolve();
      });

      this.client.on('reconnect', () => {
        metrics.reconnectAttempts += 1;
      });

      this.client.on('close', () => {
        metrics.brokerConnected = false;
        metrics.brokerSubscribed = false;
      });

      this.client.on('offline', () => {
        metrics.brokerConnected = false;
        metrics.brokerSubscribed = false;
      });

      this.client.on('error', (err: Error) => {
        // Redact any credential traces before logging
        const sanitizedMsg = err.message.replace(/:[^@]+@/, ':***@');
        console.error(`[MQTT INGEST] Broker error: ${sanitizedMsg}`);
      });

      this.client.on('message', (topic, payloadBuffer, packet) => {
        this.handleMessage(topic, payloadBuffer, packet);
      });

      // Start 5s heartbeat monitor
      this.heartbeatTimer = setInterval(() => {
        this.emitHeartbeat();
      }, 5000);
    });
  }

  public handleMessage(
    topic: string,
    payloadBuffer: Buffer,
    packet: { qos: number; retain: boolean; dup: boolean }
  ): void {
    const t0 = performance.now();
    const receivedAt = new Date().toISOString();

    const metrics = IngestMetrics.getInstance();
    const registry = DeviceRegistry.getInstance();
    const cache = IngestCache.getInstance();
    const quarantine = QuarantineManager.getInstance();
    const sink = IngestTestSink.getInstance();

    metrics.recordReceived();

    const payloadStr = payloadBuffer.toString('utf-8');

    // 1. Pure legacy parser execution
    const parseResult = parseLegacyMqttPacket(topic, payloadStr, {
      configuredTopic: this.env.MQTT_TOPIC,
      retained: packet.retain,
      dup: packet.dup,
      qos: packet.qos,
    });

    if (!parseResult.valid) {
      metrics.recordRejected(parseResult.error, parseResult.reason, topic, payloadStr);
      sink.emitRejected(parseResult.error, parseResult.reason);
      return;
    }

    const { deviceId, channelId, voltage, current, power, energyRaw, frequency } =
      parseResult.data;

    // 2. Validate device enrollment against registry
    const device = registry.getDevice(deviceId);
    if (!device || !device.enabled) {
      const q = quarantine.record({
        deviceId,
        channelId,
        reason: 'UNREGISTERED_DEVICE',
        rawPayload: payloadStr,
      });
      metrics.recordQuarantined('UNREGISTERED_DEVICE');
      sink.emitQuarantined(q);
      return;
    }

    // 3. Validate channel mapping for this device
    const channelMapping = registry.getChannelMapping(deviceId, channelId);
    if (!channelMapping || !channelMapping.enabled) {
      const q = quarantine.record({
        deviceId,
        channelId,
        reason: 'UNMAPPED_CHANNEL',
        rawPayload: payloadStr,
      });
      metrics.recordQuarantined('UNMAPPED_CHANNEL');
      sink.emitQuarantined(q);
      return;
    }

    // 4. Construct versioned Telemetry payload with immutable eventId & sequence
    this.sequence += 1n;
    const telemetry: TelemetryPayload = {
      schemaVersion: 1,
      eventId: crypto.randomUUID(),
      serverEpoch: this.serverEpoch,
      sequence: this.sequence.toString(),
      siteId: device.siteId,
      deviceId,
      channelId,
      receivedAt,
      deviceTimestamp: null,
      values: {
        voltage,
        current,
        power,
        energyRaw,
        frequency,
      },
      energyUnit: 'unknown',
      quality: parseResult.quality as TelemetryPayload['quality'],
      retained: packet.retain,
      persistence: 'pending', // Phase 2: In-memory only; Phase 3: DB persistence
    };

    // 5. Update cache immediately
    cache.set(telemetry, t0);

    const latencyMs = performance.now() - t0;
    metrics.recordAccepted(latencyMs);
    sink.emitAccepted(telemetry, latencyMs);
  }

  private emitHeartbeat(): void {
    const metrics = IngestMetrics.getInstance();
    // Structured heartbeat data for observability
    void {
      timestamp: new Date().toISOString(),
      epoch: this.serverEpoch,
      sequence: this.sequence.toString(),
      broker: metrics.brokerConnected ? 'connected' : 'disconnected',
      subscribed: metrics.brokerSubscribed,
    };
  }

  public async stop(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.client) {
      return new Promise((resolve) => {
        this.client?.end(true, {}, () => {
          this.client = null;
          const metrics = IngestMetrics.getInstance();
          metrics.brokerConnected = false;
          metrics.brokerSubscribed = false;
          resolve();
        });
      });
    }
  }

  public getEpoch(): string {
    return this.serverEpoch;
  }
}
