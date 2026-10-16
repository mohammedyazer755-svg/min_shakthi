import { Router } from 'express';
import { AuthService } from '../auth/service.js';
import { requireAuth, requireSiteAccess } from '../auth/middleware.js';
import { type ITelemetryRepository, getTelemetryRepository } from '../storage/db.js';

export function createTelemetryRouter(
  authService: AuthService,
  repo: ITelemetryRepository = getTelemetryRepository()
): Router {
  const router = Router();

  // All endpoints require authenticated session and site match
  router.use(requireAuth(authService));
  router.use(requireSiteAccess());

  // GET /api/v1/sites/:siteId/devices/:deviceId/latest
  router.get('/sites/:siteId/devices/:deviceId/latest', async (req, res) => {
    const { siteId, deviceId } = req.params;
    if (!siteId || !deviceId) {
      res.status(400).json({ error: 'MISSING_PARAMS', message: 'siteId and deviceId required' });
      return;
    }

    try {
      const latestMap = await repo.getLatestTelemetry(siteId, deviceId);
      const readings = Object.fromEntries(latestMap.entries());
      res.status(200).json({
        siteId,
        deviceId,
        readings,
      });
    } catch (err) {
      if ((err as Error).message === 'DATABASE_UNAVAILABLE') {
        res.setHeader('Retry-After', '5');
        res.status(503).json({
          error: 'DATABASE_UNAVAILABLE',
          message: 'Historical persistence temporarily unavailable. Please retry in 5 seconds.',
        });
        return;
      }
      res.status(500).json({ error: 'QUERY_ERROR', message: (err as Error).message });
    }
  });

  // GET /api/v1/sites/:siteId/devices/:deviceId/channels/:channelId/history
  router.get('/sites/:siteId/devices/:deviceId/channels/:channelId/history', async (req, res) => {
    const { siteId, deviceId, channelId } = req.params;
    const { from, to, limit } = req.query;

    if (!siteId || !deviceId || !channelId) {
      res.status(400).json({ error: 'MISSING_PARAMS', message: 'siteId, deviceId and channelId required' });
      return;
    }

    try {
      const history = await repo.getTelemetryHistory(
        siteId,
        deviceId,
        channelId,
        typeof from === 'string' ? from : undefined,
        typeof to === 'string' ? to : undefined,
        typeof limit === 'string' ? parseInt(limit, 10) : 100
      );
      res.status(200).json({
        siteId,
        deviceId,
        channelId,
        samples: history,
      });
    } catch (err) {
      if ((err as Error).message === 'DATABASE_UNAVAILABLE') {
        // T23: 503 with retry guidance, no fabricated rows or empty-success
        res.setHeader('Retry-After', '5');
        res.status(503).json({
          error: 'DATABASE_UNAVAILABLE',
          message: 'Telemetry database currently unavailable. Please retry in 5 seconds.',
        });
        return;
      }
      res.status(500).json({ error: 'QUERY_ERROR', message: (err as Error).message });
    }
  });

  // GET /api/v1/sites/:siteId/devices/:deviceId/export (CSV export with formula injection defense - T22)
  router.get('/sites/:siteId/devices/:deviceId/export', async (req, res) => {
    const { siteId, deviceId } = req.params;
    if (!siteId || !deviceId) {
      res.status(400).json({ error: 'MISSING_PARAMS' });
      return;
    }

    try {
      const history = await repo.getTelemetryHistory(siteId, deviceId, 'channel1', undefined, undefined, 50);

      // Safe CSV generation with formula escape (T22)
      const sanitizeCell = (val: string | number | null | undefined): string => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        // If string starts with =, +, -, @, prepend single quote '
        if (/^[=+\-@]/.test(str)) {
          return `'${str.replace(/"/g, '""')}`;
        }
        if (/[",\n\r]/.test(str)) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows: string[] = ['received_at,event_id,voltage,current,power,energy_raw,frequency'];
      for (const s of history) {
        rows.push([
          sanitizeCell(s.receivedAt),
          sanitizeCell(s.eventId),
          sanitizeCell(s.values.voltage),
          sanitizeCell(s.values.current),
          sanitizeCell(s.values.power),
          sanitizeCell(s.values.energyRaw),
          sanitizeCell(s.values.frequency),
        ].join(','));
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${deviceId}-telemetry.csv"`);
      res.status(200).send(rows.join('\r\n'));
    } catch (err) {
      if ((err as Error).message === 'DATABASE_UNAVAILABLE') {
        res.setHeader('Retry-After', '5');
        res.status(503).json({ error: 'DATABASE_UNAVAILABLE' });
        return;
      }
      res.status(500).json({ error: 'EXPORT_ERROR', message: (err as Error).message });
    }
  });

  return router;
}
