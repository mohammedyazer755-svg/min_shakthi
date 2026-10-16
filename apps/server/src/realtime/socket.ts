import type { Server as HttpServer } from 'node:http';
import { Server as SocketIoServer, type Socket } from 'socket.io';
import {
  type ServerToClientEvents,
  type ClientToServerEvents,
  type SnapshotPayload,
  type SnapshotChannel,
  type ChannelFreshness,
  type DeviceChannelMapping,
  DeviceSubscribeSchema,
  DisplayAckSchema,
} from '@minsakthi/contracts';
import { AuthService, type SessionContext } from '../auth/service.js';
import { DeviceRegistry } from '../ingest/registry.js';
import { IngestCache } from '../ingest/cache.js';
import { IngestMetrics } from '../observability/metrics.js';
import { type ITelemetryRepository, getTelemetryRepository } from '../storage/db.js';
import { PostgresTelemetryRepository } from '../storage/postgres.js';
import { cloudSnapshot } from './cloud-snapshot.js';

interface SocketData {
  sessionContext?: SessionContext;
  subscribedDeviceId?: string;
}

export class RealtimeSocketServer {
  private io: SocketIoServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
  private readonly serverEpoch: string;

  constructor(
    httpServer: HttpServer,
    private readonly authService: AuthService,
    private readonly repo: ITelemetryRepository = getTelemetryRepository(),
    serverEpoch?: string,
    allowedOrigins: string[] = ['http://localhost:5173']
  ) {
    this.serverEpoch = serverEpoch || crypto.randomUUID();

    this.io = new SocketIoServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(
      httpServer,
      {
        path: '/socket.io/',
        cors: {
          origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
              callback(null, true);
            } else {
              callback(new Error('Rejected by CORS policy'));
            }
          },
          credentials: true,
        },
      }
    );

    this.setupAuthMiddleware();
    this.setupEventHandlers();
  }

  private setupAuthMiddleware(): void {
    this.io.use(async (socket: Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>, next) => {
      const token =
        (socket.handshake.auth?.['token'] as string | undefined) ||
        (socket.handshake.query?.['token'] as string | undefined);

      if (!token) {
        return next(new Error('UNAUTHORIZED: Missing auth token'));
      }

      try {
        const sessionContext = await this.authService.verifyAccessToken(token);
        if (!sessionContext) {
          return next(new Error('UNAUTHORIZED: Invalid or expired token'));
        }

        socket.data.sessionContext = sessionContext;
        next();
      } catch (err) {
        next(new Error(`AUTH_ERROR: ${(err as Error).message}`));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      const session = socket.data.sessionContext;
      if (!session) {
        socket.disconnect(true);
        return;
      }

      let subscription: { requestId: string; generation: number; deviceId: string; since: string } | null = null;
      let pollTimer: NodeJS.Timeout | undefined;
      const seen = new Set<string>();
      const poll = async () => {
        const selected = subscription;
        if (!socket.connected || !selected || !(this.repo instanceof PostgresTelemetryRepository)) return;
        try {
          const token = socket.handshake.auth?.['token'] as string;
          if (!await this.authService.verifyAccessToken(token)) { socket.disconnect(true); return; }
          const history = await this.repo.queryTelemetryHistory(session.siteId,selected.deviceId,{ from:selected.since,limit:1000 });
          if (subscription !== selected || !socket.connected) return;
          const snapshot = await this.generateSnapshot(selected.requestId,selected.generation,session.siteId,selected.deviceId);
          socket.emit('state:snapshot',snapshot);
          for (const sample of [...history.samples].reverse()) {
            if (!seen.has(sample.eventId)) { socket.emit('telemetry:update',sample); seen.add(sample.eventId); }
          }
          // Inclusive overlap plus event ID deduplication handles timestamps shared by samples.
          selected.since = history.cutoff;
          if (seen.size>2000) { const retained=[...seen].slice(-1000); seen.clear(); for (const id of retained) seen.add(id); }
        } catch { socket.emit('resync:required','DATABASE_UNAVAILABLE'); }
        if (socket.connected && subscription === selected) pollTimer=setTimeout(() => { void poll(); },1000);
      };

      socket.on('device:subscribe', async (payload, callback) => {
        const parseResult = DeviceSubscribeSchema.safeParse(payload);
        if (!parseResult.success) {
          callback?.({ status: 'error', error: 'INVALID_SUBSCRIBE_PAYLOAD' });
          return;
        }

        const { siteId, deviceId, requestId, selectionGeneration } = parseResult.data;

        // Cross-site subscription rejection (T16)
        if (siteId !== session.siteId) {
          callback?.({ status: 'error', error: 'CROSS_SITE_DENIED' });
          socket.emit('resync:required', 'CROSS_SITE_DENIED');
          return;
        }

        if (this.repo instanceof PostgresTelemetryRepository) {
          try {
            const device = await this.repo.getDevice(siteId,deviceId);
            if (!device?.enabled) { callback?.({ status:'error',error:'DEVICE_NOT_FOUND' }); return; }
          } catch { callback?.({ status:'error',error:'DATABASE_UNAVAILABLE' }); return; }
        }

        // Leave previous device room if any
        if (socket.data.subscribedDeviceId) {
          socket.leave(`device:${socket.data.subscribedDeviceId}`);
        }

        socket.data.subscribedDeviceId = deviceId;
        socket.join(`device:${deviceId}`);

        // Generate atomic snapshot
        let snapshot: SnapshotPayload;
        try { snapshot = await this.generateSnapshot(
          requestId,
          selectionGeneration,
          siteId,
          deviceId
        ); } catch { callback?.({ status:'error',error:'DATABASE_UNAVAILABLE' }); return; }

        socket.emit('state:snapshot', snapshot);
        callback?.({ status: 'ok' });
        if (this.repo instanceof PostgresTelemetryRepository) {
          if (pollTimer) clearTimeout(pollTimer);
          seen.clear();
          for (const channel of snapshot.channels) if (channel.lastSample) seen.add(channel.lastSample.eventId);
          subscription={ requestId,generation:selectionGeneration,deviceId,since:new Date().toISOString() };
          pollTimer=setTimeout(() => { void poll(); },1000);
        }
      });

      socket.on('display:ack', (ackPayload) => {
        const parseResult = DisplayAckSchema.safeParse(ackPayload);
        if (parseResult.success) {
          const metrics = IngestMetrics.getInstance();
          const latency = performance.now() - parseResult.data.clientReceivedAtMs;
          metrics.recordDisplayAck(parseResult.data.eventId, latency);
        }
      });

      socket.on('disconnect', () => {
        subscription=null;
        if (pollTimer) clearTimeout(pollTimer);
      });
    });
  }

  public async generateSnapshot(
    requestId: string,
    selectionGeneration: number,
    siteId: string,
    deviceId: string
  ): Promise<SnapshotPayload> {
    if (this.repo instanceof PostgresTelemetryRepository) {
      return cloudSnapshot(this.repo,requestId,selectionGeneration,siteId,deviceId);
    }
    const registry = DeviceRegistry.getInstance();
    const cache = IngestCache.getInstance();
    const metrics = IngestMetrics.getInstance();

    const device = registry.getDevice(deviceId);
    const configuredChannels: DeviceChannelMapping[] = device
      ? Array.from(device.channels.values())
      : [];

    const now = new Date();
    const nowMs = now.getTime();

    const channels: SnapshotChannel[] = [];
    let reportingCount = 0;

    for (let slot = 1; slot <= 5; slot++) {
      const mapping = configuredChannels.find((c: DeviceChannelMapping) => c.displaySlot === slot);
      if (!mapping || !mapping.enabled) {
        channels.push({
          rawChannelId: `slot_${slot}`,
          displaySlot: slot as SnapshotChannel['displaySlot'],
          label: `Channel ${slot} (Unconfigured)`,
          lastSample: null,
          lastReceivedAt: null,
          freshness: 'unconfigured',
        });
        continue;
      }

      // Check cache for latest reading
      const cached = cache.get(deviceId, mapping.rawChannelId);
      let freshness: ChannelFreshness = 'unseen';

      if (cached) {
        const ageMs = nowMs - new Date(cached.receivedAt).getTime();
        if (ageMs <= 5000) {
          freshness = 'fresh';
          reportingCount += 1;
        } else if (ageMs <= 30000) {
          freshness = 'stale';
          reportingCount += 1;
        } else {
          freshness = 'offline_inferred';
        }
      }

      channels.push({
        rawChannelId: mapping.rawChannelId,
        displaySlot: slot as SnapshotChannel['displaySlot'],
        label: mapping.label,
        lastSample: cached?.telemetry ?? null,
        lastReceivedAt: cached?.receivedAt ?? null,
        freshness,
      });
    }

    const configuredCount = configuredChannels.filter((c: DeviceChannelMapping) => c.enabled).length;


    return {
      schemaVersion: 1,
      requestId,
      selectionGeneration,
      serverEpoch: this.serverEpoch,
      cursor: String(metrics.receivedCount),
      serverNow: now.toISOString(),
      siteId,
      deviceId,
      mappingVersion: device?.configVersion ?? 1,
      channels,
      health: {
        process: 'healthy',
        broker: metrics.brokerConnected ? 'connected' : 'disconnected',
        brokerSubscribed: metrics.brokerSubscribed,
        database: this.repo.isHealthy() ? 'healthy' : 'degraded',
        persistenceLagMs: 0,
      },
      coverage: {
        configuredSlots: configuredCount,
        reportingSlots: reportingCount,
        partial: reportingCount < configuredCount,
      },
    };
  }

  public broadcastTelemetryUpdate(payload: SnapshotPayload['channels'][0]['lastSample']): void {
    if (!payload) return;
    this.io.to(`device:${payload.deviceId}`).emit('telemetry:update', payload);
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close(() => {
        resolve();
      });
    });
  }

  public getIo(): SocketIoServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData> {
    return this.io;
  }
}
