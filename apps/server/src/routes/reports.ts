import { Router } from 'express';
import { AuthService } from '../auth/service.js';
import { requireAuth, requireSiteAccess } from '../auth/middleware.js';
import { type ITelemetryRepository, getTelemetryRepository } from '../storage/db.js';
import { generateReport } from '../reports/engine.js';
import type { TelemetryPayload } from '@minsakthi/contracts';

export function createReportsRouter(
  authService: AuthService,
  repo: ITelemetryRepository = getTelemetryRepository()
): Router {
  const router = Router();

  router.use(requireAuth(authService));
  router.use(requireSiteAccess());

  // GET /api/v1/sites/:siteId/devices/:deviceId/reports/daily
  router.get('/sites/:siteId/devices/:deviceId/reports/daily', async (req, res) => {
    const { siteId, deviceId } = req.params;
    const { date, timezone } = req.query;

    if (!siteId || !deviceId || typeof date !== 'string') {
      res.status(400).json({ error: 'MISSING_PARAMS', message: 'siteId, deviceId, and date (YYYY-MM-DD) are required.' });
      return;
    }

    try {
      // Fetch channel metadata
      const channels = await repo.getDeviceChannels(siteId, deviceId);
      const channelMeta = new Map(
        channels.map((c) => [
          c.rawChannelId,
          {
            displaySlot: c.displaySlot,
            label: c.label,
            unit: 'unknown', // ESP32 raw legacy packets are unknown tokens unless certified
            semantics: 'cumulative',
          },
        ])
      );

      // Fetch samples for all channels
      const samplesByChannel = new Map<string, TelemetryPayload[]>();
      for (const ch of channels) {
        const samples = await repo.getTelemetryHistory(siteId, deviceId, ch.rawChannelId, undefined, undefined, 5000);
        samplesByChannel.set(ch.rawChannelId, samples);
      }

      const report = generateReport(
        {
          siteId,
          deviceId,
          periodType: 'daily',
          dateOrMonth: date,
          timezone: typeof timezone === 'string' ? timezone : 'Asia/Kolkata',
        },
        samplesByChannel,
        channelMeta
      );

      res.status(200).json(report);
    } catch (err) {
      if ((err as Error).message === 'DATABASE_UNAVAILABLE') {
        res.setHeader('Retry-After', '5');
        res.status(503).json({ error: 'DATABASE_UNAVAILABLE' });
        return;
      }
      res.status(500).json({ error: 'REPORT_ERROR', message: (err as Error).message });
    }
  });

  // GET /api/v1/sites/:siteId/devices/:deviceId/reports/monthly
  router.get('/sites/:siteId/devices/:deviceId/reports/monthly', async (req, res) => {
    const { siteId, deviceId } = req.params;
    const { month, timezone } = req.query;

    if (!siteId || !deviceId || typeof month !== 'string') {
      res.status(400).json({ error: 'MISSING_PARAMS', message: 'siteId, deviceId, and month (YYYY-MM) are required.' });
      return;
    }

    try {
      const channels = await repo.getDeviceChannels(siteId, deviceId);
      const channelMeta = new Map(
        channels.map((c) => [
          c.rawChannelId,
          {
            displaySlot: c.displaySlot,
            label: c.label,
            unit: 'unknown',
            semantics: 'cumulative',
          },
        ])
      );

      const samplesByChannel = new Map<string, TelemetryPayload[]>();
      for (const ch of channels) {
        const samples = await repo.getTelemetryHistory(siteId, deviceId, ch.rawChannelId, undefined, undefined, 10000);
        samplesByChannel.set(ch.rawChannelId, samples);
      }

      const report = generateReport(
        {
          siteId,
          deviceId,
          periodType: 'monthly',
          dateOrMonth: month,
          timezone: typeof timezone === 'string' ? timezone : 'Asia/Kolkata',
        },
        samplesByChannel,
        channelMeta
      );

      res.status(200).json(report);
    } catch (err) {
      if ((err as Error).message === 'DATABASE_UNAVAILABLE') {
        res.setHeader('Retry-After', '5');
        res.status(503).json({ error: 'DATABASE_UNAVAILABLE' });
        return;
      }
      res.status(500).json({ error: 'REPORT_ERROR', message: (err as Error).message });
    }
  });

  return router;
}
