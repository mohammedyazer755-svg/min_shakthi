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
    const { from, to, limit, offset, cutoff } = req.query;

    if (!siteId || !deviceId || !channelId) {
      res.status(400).json({ error: 'MISSING_PARAMS', message: 'siteId, deviceId and channelId required' });
      return;
    }

    try {
      const result = await repo.queryTelemetryHistory(siteId, deviceId, {
        channelId,
        from: typeof from === 'string' ? from : undefined,
        to: typeof to === 'string' ? to : undefined,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : 100,
        offset: typeof offset === 'string' ? parseInt(offset, 10) : 0,
        cutoff: typeof cutoff === 'string' ? cutoff : undefined,
      });

      res.status(200).json({
        siteId,
        deviceId,
        channelId,
        samples: result.samples,
        total: result.total,
        cutoff: result.cutoff,
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

  // GET /api/v1/sites/:siteId/devices/:deviceId/history (Cross-channel history with pagination)
  router.get('/sites/:siteId/devices/:deviceId/history', async (req, res) => {
    const { siteId, deviceId } = req.params;
    const { channelId, from, to, limit, offset, cutoff } = req.query;

    if (!siteId || !deviceId) {
      res.status(400).json({ error: 'MISSING_PARAMS', message: 'siteId and deviceId required' });
      return;
    }

    try {
      const result = await repo.queryTelemetryHistory(siteId, deviceId, {
        channelId: typeof channelId === 'string' ? channelId : 'all',
        from: typeof from === 'string' ? from : undefined,
        to: typeof to === 'string' ? to : undefined,
        limit: typeof limit === 'string' ? parseInt(limit, 10) : 100,
        offset: typeof offset === 'string' ? parseInt(offset, 10) : 0,
        cutoff: typeof cutoff === 'string' ? cutoff : undefined,
      });

      res.status(200).json({
        siteId,
        deviceId,
        channelId: channelId || 'all',
        samples: result.samples,
        total: result.total,
        cutoff: result.cutoff,
      });
    } catch (err) {
      if ((err as Error).message === 'DATABASE_UNAVAILABLE') {
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
    const { channelId, from, to, cutoff } = req.query;

    if (!siteId || !deviceId) {
      res.status(400).json({ error: 'MISSING_PARAMS' });
      return;
    }

    try {
      const history = await repo.queryTelemetryHistory(siteId, deviceId, {
        channelId: typeof channelId === 'string' ? channelId : undefined,
        from: typeof from === 'string' ? from : undefined,
        to: typeof to === 'string' ? to : undefined,
        cutoff: typeof cutoff === 'string' ? cutoff : undefined,
        limit: 10000,
        offset: 0,
      });

      // Safe CSV generation with formula escape (T22: =, +, -, @ prepended with ')
      const sanitizeCell = (val: string | number | null | undefined): string => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        // If text cell starts with =, +, -, @, prepend single quote '
        if (/^[=+\-@]/.test(str)) {
          return `'${str.replace(/"/g, '""')}`;
        }
        if (/[",\n\r]/.test(str)) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows: string[] = [
        'received_at,event_id,channel_id,voltage,current,power,energy_raw,frequency',
      ];
      for (const s of history.samples) {
        rows.push(
          [
            sanitizeCell(s.receivedAt),
            sanitizeCell(s.eventId),
            sanitizeCell(s.channelId),
            sanitizeCell(s.values.voltage),
            sanitizeCell(s.values.current),
            sanitizeCell(s.values.power),
            sanitizeCell(s.values.energyRaw),
            sanitizeCell(s.values.frequency),
          ].join(',')
        );
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${deviceId}-${channelId || 'all'}-telemetry.csv"`
      );
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
