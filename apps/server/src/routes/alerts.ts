import { Router } from 'express';
import { AuthService } from '../auth/service.js';
import { requireAuth, requireSiteAccess, requireSiteRole } from '../auth/middleware.js';
import { type ITelemetryRepository, getTelemetryRepository } from '../storage/db.js';
import { AlertRuleSchema, type AlertRule } from '@minsakthi/contracts';

export function createAlertsRouter(
  authService: AuthService,
  repo: ITelemetryRepository = getTelemetryRepository()
): Router {
  const router = Router();

  router.use(requireAuth(authService));
  router.use(requireSiteAccess());

  // GET /api/v1/sites/:siteId/alerts
  router.get('/sites/:siteId/alerts', async (req, res) => {
    const siteId = req.params['siteId'] as string;
    const { deviceId, state } = req.query;

    try {
      const alerts = await repo.getAlerts(
        siteId,
        typeof deviceId === 'string' ? deviceId : undefined,
        state === 'open' || state === 'acknowledged' || state === 'resolved' ? state : undefined
      );
      res.status(200).json({ siteId, alerts });
    } catch (err) {
      if ((err as Error).message === 'DATABASE_UNAVAILABLE') {
        res.setHeader('Retry-After', '5');
        res.status(503).json({ error: 'DATABASE_UNAVAILABLE' });
        return;
      }
      res.status(500).json({ error: 'ALERTS_QUERY_ERROR', message: (err as Error).message });
    }
  });

  // POST /api/v1/sites/:siteId/alerts/:alertId/ack (Operator or Admin can acknowledge - R14, T21)
  router.post(
    '/sites/:siteId/alerts/:alertId/ack',
    requireSiteRole('operator'),
    async (req, res) => {
      const siteId = req.params['siteId'] as string;
      const alertId = req.params['alertId'] as string;
      const { note } = req.body;
      const ctx = req.sessionContext!;

      if (!siteId || !alertId) {
        res.status(400).json({ error: 'MISSING_PARAMS' });
        return;
      }

      try {
        const updatedAlert = await repo.acknowledgeAlert(
          alertId,
          ctx.userId,
          ctx.user.displayName,
          typeof note === 'string' ? note : undefined
        );

        await repo.addAuditLog({
          siteId,
          actorId: ctx.userId,
          action: 'ACKNOWLEDGE_ALERT',
          target: `alert:${alertId}`,
          beforeJson: null,
          afterJson: { alertId, ackBy: ctx.user.displayName, note },
        });

        res.status(200).json(updatedAlert);
      } catch (err) {
        if ((err as Error).message === 'ALERT_NOT_FOUND') {
          res.status(404).json({ error: 'ALERT_NOT_FOUND' });
          return;
        }
        res.status(500).json({ error: 'ACK_ERROR', message: (err as Error).message });
      }
    }
  );

  // GET /api/v1/sites/:siteId/alerts/rules
  router.get('/sites/:siteId/alerts/rules', async (req, res) => {
    const siteId = req.params['siteId'] as string;
    const { deviceId } = req.query;

    try {
      const rules = await repo.getAlertRules(
        siteId,
        typeof deviceId === 'string' ? deviceId : undefined
      );
      res.status(200).json({ siteId, rules });
    } catch (err) {
      res.status(500).json({ error: 'RULES_QUERY_ERROR', message: (err as Error).message });
    }
  });

  // POST /api/v1/sites/:siteId/alerts/rules (Admin only - R15)
  router.post(
    '/sites/:siteId/alerts/rules',
    requireSiteRole('admin'),
    async (req, res) => {
      const siteId = req.params['siteId'] as string;
      const ctx = req.sessionContext!;
      const parsed = AlertRuleSchema.safeParse({
        ...req.body,
        id: req.body.id || crypto.randomUUID(),
        siteId,
      });

      if (!parsed.success) {
        res.status(400).json({ error: 'INVALID_RULE_DATA', details: parsed.error.issues });
        return;
      }

      try {
        const saved = await repo.saveAlertRule(parsed.data as AlertRule, ctx.userId);
        res.status(201).json(saved);
      } catch (err) {
        res.status(500).json({ error: 'SAVE_RULE_ERROR', message: (err as Error).message });
      }
    }
  );

  // PUT /api/v1/sites/:siteId/alerts/rules/:ruleId (Admin only - R15)
  router.put(
    '/sites/:siteId/alerts/rules/:ruleId',
    requireSiteRole('admin'),
    async (req, res) => {
      const siteId = req.params['siteId'] as string;
      const ruleId = req.params['ruleId'] as string;
      const ctx = req.sessionContext!;
      const parsed = AlertRuleSchema.safeParse({
        ...req.body,
        id: ruleId,
        siteId,
      });

      if (!parsed.success) {
        res.status(400).json({ error: 'INVALID_RULE_DATA', details: parsed.error.issues });
        return;
      }

      try {
        const saved = await repo.saveAlertRule(parsed.data as AlertRule, ctx.userId);
        res.status(200).json(saved);
      } catch (err) {
        res.status(500).json({ error: 'UPDATE_RULE_ERROR', message: (err as Error).message });
      }
    }
  );

  // DELETE /api/v1/sites/:siteId/alerts/rules/:ruleId (Admin only - R15)
  router.delete(
    '/sites/:siteId/alerts/rules/:ruleId',
    requireSiteRole('admin'),
    async (req, res) => {
      const siteId = req.params['siteId'] as string;
      const ruleId = req.params['ruleId'] as string;
      const ctx = req.sessionContext!;

      if (!siteId || !ruleId) {
        res.status(400).json({ error: 'MISSING_PARAMS' });
        return;
      }

      try {
        const deleted = await repo.deleteAlertRule(siteId, ruleId, ctx.userId);
        if (!deleted) {
          res.status(404).json({ error: 'RULE_NOT_FOUND' });
          return;
        }
        res.status(200).json({ success: true, ruleId });
      } catch (err) {
        res.status(500).json({ error: 'DELETE_RULE_ERROR', message: (err as Error).message });
      }
    }
  );

  return router;
}
