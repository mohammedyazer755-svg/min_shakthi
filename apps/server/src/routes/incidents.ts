import { Router } from 'express';
import { AuthService } from '../auth/service.js';
import { requireAuth, requireSiteAccess, requireSiteRole } from '../auth/middleware.js';
import { type ITelemetryRepository, getTelemetryRepository } from '../storage/db.js';

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '';
  let str = String(val);

  // CSV Formula Injection Prevention:
  // If the field starts with =, +, -, @, tab, or carriage return, prefix with a single quote.
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // If contains comma, quote, or newline, escape double quotes and wrap in quotes
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function createIncidentsRouter(
  authService: AuthService,
  repo: ITelemetryRepository = getTelemetryRepository()
): Router {
  const router = Router();

  router.use(requireAuth(authService));
  router.use(requireSiteAccess());

  // GET /api/v1/sites/:siteId/incidents
  router.get('/sites/:siteId/incidents', async (req, res) => {
    const siteId = req.params['siteId'] as string;
    const { deviceId, state, type, limit, offset } = req.query;

    try {
      const result = await repo.getIncidents(siteId, {
        deviceId: typeof deviceId === 'string' ? deviceId : undefined,
        state: state === 'evaluating' || state === 'resolved' || state === 'acknowledged' ? state : undefined,
        type: type === 'electrical_breach' || type === 'device_interruption' || type === 'transport_outage' ? type : undefined,
        limit: limit ? Number(limit) : 50,
        offset: offset ? Number(offset) : 0,
      });

      res.status(200).json({
        siteId,
        incidents: result.incidents,
        total: result.total,
      });
    } catch (err) {
      if ((err as Error).message === 'DATABASE_UNAVAILABLE') {
        res.setHeader('Retry-After', '5');
        res.status(503).json({ error: 'DATABASE_UNAVAILABLE' });
        return;
      }
      res.status(500).json({ error: 'INCIDENTS_QUERY_ERROR', message: (err as Error).message });
    }
  });

  // GET /api/v1/sites/:siteId/incidents/:incidentId
  router.get('/sites/:siteId/incidents/:incidentId', async (req, res) => {
    const siteId = req.params['siteId'] as string;
    const incidentId = req.params['incidentId'] as string;

    try {
      const incident = await repo.getIncidentById(siteId, incidentId);
      if (!incident) {
        res.status(404).json({ error: 'INCIDENT_NOT_FOUND' });
        return;
      }

      res.status(200).json(incident);
    } catch (err) {
      res.status(500).json({ error: 'INCIDENT_FETCH_ERROR', message: (err as Error).message });
    }
  });

  // POST /api/v1/sites/:siteId/incidents/:incidentId/ack (Operator or Admin only)
  router.post(
    '/sites/:siteId/incidents/:incidentId/ack',
    requireSiteRole('operator'),
    async (req, res) => {
      const siteId = req.params['siteId'] as string;
      const incidentId = req.params['incidentId'] as string;
      const { note } = req.body;
      const ctx = req.sessionContext!;

      try {
        const updated = await repo.acknowledgeIncident(
          siteId,
          incidentId,
          ctx.userId,
          ctx.user.displayName,
          typeof note === 'string' ? note : undefined
        );

        await repo.addAuditLog({
          siteId,
          actorId: ctx.userId,
          action: 'ACKNOWLEDGE_INCIDENT',
          target: `incident:${incidentId}`,
          beforeJson: null,
          afterJson: { incidentId, ackBy: ctx.user.displayName, note },
        });

        res.status(200).json(updated);
      } catch (err) {
        if ((err as Error).message === 'INCIDENT_NOT_FOUND') {
          res.status(404).json({ error: 'INCIDENT_NOT_FOUND' });
          return;
        }
        res.status(500).json({ error: 'ACK_ERROR', message: (err as Error).message });
      }
    }
  );

  // GET /api/v1/sites/:siteId/incidents/:incidentId/export/csv
  router.get('/sites/:siteId/incidents/:incidentId/export/csv', async (req, res) => {
    const siteId = req.params['siteId'] as string;
    const incidentId = req.params['incidentId'] as string;

    try {
      const incident = await repo.getIncidentById(siteId, incidentId);
      if (!incident) {
        res.status(404).json({ error: 'INCIDENT_NOT_FOUND' });
        return;
      }

      const lines: string[] = [];

      // Metadata Header
      lines.push('# MIN-SAKTHI Incident Evidence Export');
      lines.push(`# Incident ID: ${escapeCsvField(incident.id)}`);
      lines.push(`# Title: ${escapeCsvField(incident.title)}`);
      lines.push(`# Device: ${escapeCsvField(incident.deviceId)}`);
      lines.push(`# Channel: ${escapeCsvField(incident.channelId ?? 'All Channels')}`);
      lines.push(`# Type: ${escapeCsvField(incident.type)}`);
      lines.push(`# Severity: ${escapeCsvField(incident.severity)}`);
      lines.push(`# State: ${escapeCsvField(incident.state)}`);
      lines.push(`# Started At: ${escapeCsvField(incident.startedAt)}`);
      lines.push(`# Ended At: ${escapeCsvField(incident.endedAt ?? 'Ongoing')}`);
      lines.push(`# Duration (seconds): ${escapeCsvField(incident.durationMs ?? 0)}`);
      lines.push(`# Summary: ${escapeCsvField(incident.summary)}`);
      lines.push(`# Cause Confirmation: ${escapeCsvField(incident.causeConfirmation)}`);
      lines.push('# Evidence Limitations: Server receipt timestamps; missing data is not zero load; physical power cut vs Wi-Fi/firmware failure unverified.');
      lines.push('');

      // Timeline Samples Header
      lines.push(['Timestamp (ISO)', 'Phase', 'Channel ID', 'Voltage (V)', 'Current (A)', 'Power (W)', 'Frequency (Hz)', 'Energy Raw', 'Event ID']
        .map(escapeCsvField).join(','));

      for (const s of incident.evidence.samples) {
        lines.push([
          s.timestamp,
          s.phase,
          s.channelId,
          s.voltage !== null ? s.voltage : 'GAP',
          s.current !== null ? s.current : 'GAP',
          s.power !== null ? s.power : 'GAP',
          s.frequency !== null ? s.frequency : 'GAP',
          s.energyRaw ?? '',
          s.eventId ?? '',
        ].map(escapeCsvField).join(','));
      }

      const csvContent = lines.join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="incident-${incident.id}.csv"`);
      res.status(200).send(csvContent);
    } catch (err) {
      res.status(500).json({ error: 'CSV_EXPORT_ERROR', message: (err as Error).message });
    }
  });

  // GET /api/v1/sites/:siteId/incidents/:incidentId/export/html (Print-ready report)
  router.get('/sites/:siteId/incidents/:incidentId/export/html', async (req, res) => {
    const siteId = req.params['siteId'] as string;
    const incidentId = req.params['incidentId'] as string;

    try {
      const incident = await repo.getIncidentById(siteId, incidentId);
      if (!incident) {
        res.status(404).send('<h1>Incident Not Found</h1>');
        return;
      }

      const extrema = incident.evidence.extrema;
      const gaps = incident.evidence.gaps;
      const samples = incident.evidence.samples;
      const acks = incident.acknowledgements;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Incident Report: ${escapeHtml(incident.title)}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #202321; line-height: 1.5; font-size: 13px; margin: 0; padding: 24px; }
    .header { border-bottom: 2px solid #dddcd5; padding-bottom: 16px; margin-bottom: 20px; }
    .brand { font-size: 11px; font-weight: 700; letter-spacing: 0.15em; color: #725719; text-transform: uppercase; margin-bottom: 4px; }
    h1 { font-size: 20px; font-weight: 800; margin: 0 0 8px 0; color: #202321; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge-critical { background: #fee2e2; color: #991b1b; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-info { background: #e0f2fe; color: #075985; }
    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; background: #f7f6f2; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 12px; }
    .meta-item strong { display: block; font-size: 10px; color: #5d625d; text-transform: uppercase; }
    .summary-box { background: #ffffff; border: 1px solid #dddcd5; border-left: 4px solid #a38445; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px; font-size: 13px; font-weight: 500; }
    .disclaimer-box { background: #fbfbf9; border: 1px dashed #dddcd5; padding: 10px 14px; border-radius: 4px; margin-bottom: 24px; font-size: 11px; color: #5d625d; }
    h2 { font-size: 14px; font-weight: 700; margin: 20px 0 8px 0; border-bottom: 1px solid #dddcd5; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
    th { text-align: left; padding: 6px 8px; background: #f0f1ec; color: #5d625d; font-weight: 700; border-bottom: 1px solid #dddcd5; }
    td { padding: 6px 8px; border-bottom: 1px solid #f0f1ec; font-variant-numeric: tabular-nums; }
    .phase-before { color: #0284c7; }
    .phase-during { color: #d97706; font-weight: 700; }
    .phase-after { color: #16a34a; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px;">
    <button onclick="window.print()" style="padding: 8px 16px; background: #a38445; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">
      Print / Save PDF
    </button>
  </div>

  <div class="header">
    <div class="brand">MIN-SAKTHI V2 · POWER EVENT INVESTIGATOR</div>
    <h1>${escapeHtml(incident.title)}</h1>
    <div>
      <span class="badge badge-${incident.severity}">${incident.severity}</span>
      <span style="font-size: 12px; margin-left: 8px; color: #5d625d;">Status: <strong>${incident.state}</strong></span>
    </div>
  </div>

  <div class="summary-box">
    <strong>Deterministic Findings:</strong><br />
    ${escapeHtml(incident.summary)}
  </div>

  <div class="disclaimer-box">
    <strong>Evidence Boundaries &amp; Integrity Notes:</strong><br />
    • Timestamps reflect server-receipt time, not calibrated edge device event time.<br />
    • Missing data indicates missing packets; missing data is not zero electrical load.<br />
    • Cause confirmation: <em>${escapeHtml(incident.causeConfirmation)}</em> (physical root causes remain unverified without hardware diagnostics).
  </div>

  <div class="meta-grid">
    <div class="meta-item"><strong>Device ID</strong>${escapeHtml(incident.deviceId)}</div>
    <div class="meta-item"><strong>Channel</strong>${escapeHtml(incident.evidence.channelLabel ?? incident.channelId ?? 'All Channels')}</div>
    <div class="meta-item"><strong>Observed Duration</strong>${incident.durationMs ?? 0} seconds</div>
    <div class="meta-item"><strong>Detection Time</strong>${escapeHtml(incident.evidence.detectionTime)}</div>
    <div class="meta-item"><strong>Recovery Time</strong>${escapeHtml(incident.evidence.recoveryTime ?? 'Ongoing')}</div>
    <div class="meta-item"><strong>Last Received</strong>${escapeHtml(incident.evidence.lastReceivedAt ?? 'None')}</div>
  </div>

  ${extrema.minVoltage !== undefined || extrema.maxCurrent !== undefined || extrema.maxPower !== undefined ? `
  <h2>Observed Extrema During Incident</h2>
  <table>
    <thead>
      <tr>
        <th>Min Voltage (V)</th>
        <th>Max Voltage (V)</th>
        <th>Max Current (A)</th>
        <th>Max Power (W)</th>
        <th>Min Frequency (Hz)</th>
        <th>Max Frequency (Hz)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${extrema.minVoltage ?? '—'}</td>
        <td>${extrema.maxVoltage ?? '—'}</td>
        <td>${extrema.maxCurrent ?? '—'}</td>
        <td>${extrema.maxPower ?? '—'}</td>
        <td>${extrema.minFrequency ?? '—'}</td>
        <td>${extrema.maxFrequency ?? '—'}</td>
      </tr>
    </tbody>
  </table>
  ` : ''}

  ${gaps.length > 0 ? `
  <h2>Recorded Observation Gaps</h2>
  <table>
    <thead>
      <tr>
        <th>Start Time</th>
        <th>End Time</th>
        <th>Duration (s)</th>
        <th>Reason</th>
      </tr>
    </thead>
    <tbody>
      ${gaps.map((g) => `
        <tr>
          <td>${escapeHtml(g.startAt)}</td>
          <td>${escapeHtml(g.endAt ?? 'Active')}</td>
          <td>${g.durationMs ? Math.round(g.durationMs / 1000) : 'Active'}</td>
          <td>${escapeHtml(g.reason ?? 'Telemetry silence')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <h2>Chronological Sample Timeline (Before / During / After)</h2>
  <table>
    <thead>
      <tr>
        <th>Timestamp</th>
        <th>Phase</th>
        <th>Channel</th>
        <th>Voltage (V)</th>
        <th>Current (A)</th>
        <th>Power (W)</th>
        <th>Frequency (Hz)</th>
      </tr>
    </thead>
    <tbody>
      ${samples.slice(0, 80).map((s) => `
        <tr>
          <td>${escapeHtml(s.timestamp)}</td>
          <td class="phase-${s.phase}">${escapeHtml(s.phase.toUpperCase())}</td>
          <td>${escapeHtml(s.channelId)}</td>
          <td>${s.voltage !== null ? s.voltage : '<em style="color:#ef4444">GAP</em>'}</td>
          <td>${s.current !== null ? s.current : '<em style="color:#ef4444">GAP</em>'}</td>
          <td>${s.power !== null ? s.power : '<em style="color:#ef4444">GAP</em>'}</td>
          <td>${s.frequency !== null ? s.frequency : '<em style="color:#ef4444">GAP</em>'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  ${acks.length > 0 ? `
  <h2>Operator &amp; Admin Acknowledgements</h2>
  <table>
    <thead>
      <tr>
        <th>Acknowledged At</th>
        <th>User</th>
        <th>Note</th>
      </tr>
    </thead>
    <tbody>
      ${acks.map((a) => `
        <tr>
          <td>${escapeHtml(a.ackAt)}</td>
          <td>${escapeHtml(a.userDisplayName ?? a.userId)}</td>
          <td>${escapeHtml(a.note ?? 'None')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <div style="margin-top: 32px; font-size: 10px; color: #888; text-align: center; border-top: 1px solid #dddcd5; padding-top: 8px;">
    Generated by MIN-SAKTHI V2 Civil Energy System · Document ID: ${incident.id}
  </div>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(html);
    } catch (err) {
      res.status(500).send(`<h1>Report Generation Error: ${(err as Error).message}</h1>`);
    }
  });

  return router;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
