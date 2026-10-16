import { Router } from 'express';
import { AuthService } from '../auth/service.js';
import { requireAuth, requireSiteRole } from '../auth/middleware.js';
import { type ITelemetryRepository, getTelemetryRepository } from '../storage/db.js';
import { UpdateUserPreferencesRequestSchema } from '@minsakthi/contracts';

export function createUsersRouter(
  authService: AuthService,
  repo: ITelemetryRepository = getTelemetryRepository()
): Router {
  const router = Router();

  router.use(requireAuth(authService));

  // GET /api/v1/users/me/preferences (R16)
  router.get('/me/preferences', async (req, res) => {
    try {
      const ctx = req.sessionContext!;
      const prefs = await repo.getUserPreferences(ctx.userId);
      res.status(200).json(prefs);
    } catch (err) {
      res.status(500).json({ error: 'PREFS_QUERY_ERROR', message: (err as Error).message });
    }
  });

  // PUT /api/v1/users/me/preferences (R16)
  router.put('/me/preferences', async (req, res) => {
    const parsed = UpdateUserPreferencesRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'INVALID_PREFS_DATA', details: parsed.error.issues });
      return;
    }

    try {
      const ctx = req.sessionContext!;
      const updated = await repo.updateUserPreferences(ctx.userId, parsed.data);
      res.status(200).json(updated);
    } catch (err) {
      res.status(500).json({ error: 'PREFS_UPDATE_ERROR', message: (err as Error).message });
    }
  });

  // GET /api/v1/sites/:siteId/audit-logs (Admin only - R15)
  router.get(
    '/sites/:siteId/audit-logs',
    requireSiteRole('admin'),
    async (req, res) => {
      const siteId = req.params['siteId'] as string;
      const { limit } = req.query;

      try {
        const logs = await repo.getAuditLogs(
          siteId,
          typeof limit === 'string' ? parseInt(limit, 10) : 50
        );
        res.status(200).json({ siteId, logs });
      } catch (err) {
        res.status(500).json({ error: 'AUDIT_QUERY_ERROR', message: (err as Error).message });
      }
    }
  );

  return router;
}
