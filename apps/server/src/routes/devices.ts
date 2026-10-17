import { Router } from 'express';
import { AuthService } from '../auth/service.js';
import { requireAuth, requireSiteAccess, requireSiteRole } from '../auth/middleware.js';
import { type ITelemetryRepository, getTelemetryRepository } from '../storage/db.js';
import { PostgresTelemetryRepository } from '../storage/postgres.js';
import { IngestMetrics } from '../observability/metrics.js';
import {
  UpdateDeviceMappingRequestSchema,
  readingFreshness,
  type DeviceDiagnostics,
} from '@minsakthi/contracts';

export function createDevicesRouter(
  authService: AuthService,
  repo: ITelemetryRepository = getTelemetryRepository()
): Router {
  const router = Router();

  router.use(requireAuth(authService));
  router.use(requireSiteAccess());

  // GET /api/v1/sites/:siteId/devices/:deviceId (Diagnostics & config)
  router.get('/sites/:siteId/devices/:deviceId', async (req, res) => {
    const siteId = req.params['siteId'] as string;
    const deviceId = req.params['deviceId'] as string;

    try {
      const dev = await repo.getDevice(siteId, deviceId);
      if (!dev) {
        res.status(404).json({ error: 'DEVICE_NOT_FOUND' });
        return;
      }

      const channels = await repo.getDeviceChannels(siteId, deviceId);
      const latestMap = await repo.getLatestTelemetry(siteId, deviceId);
      const worker = repo instanceof PostgresTelemetryRepository ? await repo.getWorkerStatus() : null;
      const brokerConnected = repo instanceof PostgresTelemetryRepository
        ? !!worker && Date.now()-new Date(worker.at).getTime()<6000 && worker.connected && worker.subscribed
        : IngestMetrics.getInstance().brokerConnected;

      const diagnostics: DeviceDiagnostics = {
        deviceId: dev.rawDeviceId,
        rawDeviceId: dev.rawDeviceId,
        siteId: dev.siteId,
        enabled: dev.enabled,
        expectedIntervalMs: dev.expectedIntervalMs,
        configVersion: dev.configVersion,
        brokerStatus: brokerConnected ? 'connected' : 'disconnected',
        lastReceivedAt: Array.from(latestMap.values()).map((s) => s.receivedAt).sort().at(-1) ?? null,
        totalPacketsReceived: repo instanceof PostgresTelemetryRepository ? await repo.getDevicePacketCount(siteId,deviceId) : IngestMetrics.getInstance().totalAccepted,
        quarantineCount: null,
        intervalJitterMs: null,
        channels: channels.map((c) => {
          const latest = latestMap.get(c.rawChannelId);
          return {
            rawChannelId: c.rawChannelId,
            displaySlot: c.displaySlot,
            label: c.label,
            enabled: c.enabled,
            freshness:readingFreshness({ receivedAt:latest?.receivedAt ?? null,retained:latest?.retained,
              suspectDuplicate:latest?.quality.includes('SUSPECT_DUPLICATE'),
              configured:c.enabled && !!c.displaySlot,expectedIntervalMs:dev.expectedIntervalMs,
              nowMs:Date.now(),transportAvailable:brokerConnected }),
            lastSeenAt: latest?.receivedAt ?? null,
          };
        }),
      };

      res.status(200).json(diagnostics);
    } catch (err) {
      if ((err as Error).message === 'DATABASE_UNAVAILABLE') {
        res.setHeader('Retry-After', '5');
        res.status(503).json({ error: 'DATABASE_UNAVAILABLE' });
        return;
      }
      res.status(500).json({ error: 'DEVICE_QUERY_ERROR', message: (err as Error).message });
    }
  });

  // GET /api/v1/sites/:siteId/devices/:deviceId/mapping
  router.get('/sites/:siteId/devices/:deviceId/mapping', async (req, res) => {
    const siteId = req.params['siteId'] as string;
    const deviceId = req.params['deviceId'] as string;

    try {
      const dev = await repo.getDevice(siteId, deviceId);
      if (!dev) {
        res.status(404).json({ error: 'DEVICE_NOT_FOUND' });
        return;
      }

      const channels = await repo.getDeviceChannels(siteId, deviceId);
      res.status(200).json({
        deviceId: dev.rawDeviceId,
        configVersion: dev.configVersion,
        mappings: channels.map((c) => ({
          channelId: c.rawChannelId,
          displaySlot: c.displaySlot,
          label: c.label,
          enabled: c.enabled,
        })),
      });
    } catch (err) {
      res.status(500).json({ error: 'MAPPING_QUERY_ERROR', message: (err as Error).message });
    }
  });

  // PUT /api/v1/sites/:siteId/devices/:deviceId/mapping (Optimistic locking R15 - Admin only)
  router.put(
    '/sites/:siteId/devices/:deviceId/mapping',
    requireSiteRole('admin'),
    async (req, res) => {
      const siteId = req.params['siteId'] as string;
      const deviceId = req.params['deviceId'] as string;
      const ctx = req.sessionContext!;
      const parsed = UpdateDeviceMappingRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ error: 'INVALID_MAPPING_DATA', details: parsed.error.issues });
        return;
      }

      try {
        const result = await repo.updateDeviceMapping(
          siteId,
          deviceId,
          parsed.data.expectedConfigVersion,
          parsed.data.mappings,
          ctx.userId
        );

        res.status(200).json({
          success: true,
          deviceId,
          configVersion: result.configVersion,
          mappings: result.channels.map((c) => ({
            channelId: c.rawChannelId,
            displaySlot: c.displaySlot,
            label: c.label,
            enabled: c.enabled,
          })),
        });
      } catch (err) {
        if ((err as Error).message === 'OPTIMISTIC_LOCK_CONFLICT') {
          // 409 Conflict with optimistic lock error
          res.status(409).json({
            error: 'OPTIMISTIC_LOCK_CONFLICT',
            message: 'Device configuration was modified by another user. Please reload current mappings.',
          });
          return;
        }
        if ((err as Error).message === 'DEVICE_NOT_FOUND') {
          res.status(404).json({ error: 'DEVICE_NOT_FOUND' });
          return;
        }
        res.status(500).json({ error: 'UPDATE_MAPPING_ERROR', message: (err as Error).message });
      }
    }
  );

  return router;
}
