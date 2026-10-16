import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '../components';
import { useAuth } from '../auth/AuthContext';
import type { UseLiveTelemetryResult } from '../live/useLiveTelemetry';
import {
  Calendar,
  AlertOctagon,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import type { ReportRecord } from '@minsakthi/contracts';

export interface ReportsProps {
  telemetry: UseLiveTelemetryResult;
  selectedDevice: string;
}

export const Reports: React.FC<ReportsProps> = ({ selectedDevice }) => {
  const { accessToken, user } = useAuth();
  const [periodType, setPeriodType] = useState<'daily' | 'monthly'>('daily');
  const [dateStr, setDateStr] = useState<string>('2026-10-16');
  const [report, setReport] = useState<ReportRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!accessToken || !user) return;
    setLoading(true);
    setError(null);

    try {
      const endpoint = periodType === 'daily'
        ? `/api/v1/sites/${user.siteId}/devices/${selectedDevice}/reports/daily?date=${dateStr}`
        : `/api/v1/sites/${user.siteId}/devices/${selectedDevice}/reports/monthly?month=${dateStr}`;

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.status === 503) {
        setError('Report computation service temporarily unavailable. Please retry in 5 seconds.');
        setReport(null);
        return;
      }

      if (!res.ok) {
        throw new Error(`Report generation failed: ${res.statusText}`);
      }

      const data: ReportRecord = await res.json();
      setReport(data);
    } catch (err) {
      setError((err as Error).message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, user, selectedDevice, periodType, dateStr]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface p-4 rounded-card border border-border">
        <div>
          <h2 className="text-base font-bold text-text-primary tracking-tight">
            Certified Periodic Reports &amp; Tariffs
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Defensible civil interval aggregation, boundary gap detection, and explicit billing suppression disclosures.
          </p>
        </div>

        {report && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-canvas rounded border border-border text-xs text-text-secondary font-mono">
              <Clock className="w-3.5 h-3.5 text-brand-gold-text" aria-hidden="true" />
              <span>{`Revision: v${report.revision}`}</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
              {report.status.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Control Card: Period, Date, Timezone */}
      <Card className="p-4 bg-surface border border-border flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-gold-text" aria-hidden="true" />
            <span className="font-semibold text-text-primary">Period:</span>
            <div className="inline-flex rounded border border-border p-0.5 bg-canvas">
              <button
                type="button"
                onClick={() => {
                  setPeriodType('daily');
                  setDateStr('2026-10-16');
                }}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  periodType === 'daily' ? 'bg-surface text-brand-gold-text shadow-xs' : 'text-text-secondary'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => {
                  setPeriodType('monthly');
                  setDateStr('2026-10');
                }}
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  periodType === 'monthly' ? 'bg-surface text-brand-gold-text shadow-xs' : 'text-text-secondary'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-primary">Target:</span>
            <input
              type={periodType === 'daily' ? 'date' : 'month'}
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="px-2.5 py-1 bg-canvas border border-border rounded text-text-primary font-mono text-xs focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 text-text-secondary">
            <span>Timezone:</span>
            <strong className="text-text-primary font-mono">Asia/Kolkata (UTC+05:30)</strong>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchReport}
          disabled={loading}
          className="inline-flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>Generate Report</span>
        </Button>
      </Card>

      {/* Degraded Error */}
      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-control flex items-center gap-3 text-xs text-brand-gold-text">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Non-negotiable Billing Suppression Notice (R12, R13, T17) */}
      <div className="p-4 bg-amber-50/70 border border-brand-gold/30 rounded-card flex items-start gap-3 text-xs">
        <AlertOctagon className="w-5 h-5 text-brand-gold-text shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <h4 className="font-bold text-text-primary">
            Contract Notice: Verified Billing Calculation Suppressed
          </h4>
          <p className="text-text-secondary leading-relaxed">
            {report?.totals.billingSuppressionNotice ||
              'ESP32 raw legacy packets supply cumulative energy as uncalibrated tokens without verified tariff approval or certified calibration evidence. Verified currency calculations are strictly suppressed.'}
          </p>
        </div>
      </div>

      {report && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-surface border border-border">
              <span className="text-xs text-text-secondary font-medium">Coverage Fraction</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-text-primary">
                  {`${(report.coverage.timeCoveredFraction * 100).toFixed(1)}%`}
                </span>
                <span className="text-[11px] text-brand-gold-text font-semibold capitalize">
                  {report.coverage.boundaryQuality.replace('_', ' ')}
                </span>
              </div>
              <span className="text-[11px] text-text-secondary mt-1 block font-mono">
                {`${report.coverage.receivedSampleCount} / ${report.coverage.expectedSampleCount} samples`}
              </span>
            </Card>

            <Card className="p-4 bg-surface border border-border">
              <span className="text-xs text-text-secondary font-medium">Identified Gaps</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-text-primary">
                  {report.coverage.gaps.length}
                </span>
                <span className="text-[11px] text-text-secondary">intervals</span>
              </div>
              <span className="text-[11px] text-text-secondary mt-1 block">
                {report.coverage.gaps.length === 0 ? 'Zero missing packet timeouts' : 'Discontinuous data'}
              </span>
            </Card>

            <Card className="p-4 bg-surface border border-border">
              <span className="text-xs text-text-secondary font-medium">Verified Consumption</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-text-primary">
                  {report.totals.totalUsageKwh !== null ? `${report.totals.totalUsageKwh} kWh` : '—'}
                </span>
              </div>
              <span className="text-[11px] text-text-secondary mt-1 block">
                {report.totals.totalUsageKwh !== null ? 'Sum of verified channels' : 'Uncalibrated tokens'}
              </span>
            </Card>

            <Card className="p-4 bg-surface border border-border">
              <span className="text-xs text-text-secondary font-medium">Certified Utility Cost</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-text-primary">
                  {report.totals.costEstimateInr !== null ? `₹${report.totals.costEstimateInr}` : '—'}
                </span>
                <span className="text-[10px] text-status-warning font-semibold">
                  {report.totals.isCostVerified ? 'Verified' : 'Suppressed'}
                </span>
              </div>
              <span className="text-[11px] text-text-secondary mt-1 block">
                {report.totals.isCostVerified ? 'Approved Tariff' : 'Requires tariff certification'}
              </span>
            </Card>
          </div>

          {/* Channel Detail Table */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-border bg-surface flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text-primary tracking-tight">
                  Channel Usage &amp; Counter Delta Breakdown
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Calculated strictly across verified epochs without synthetic interpolation or proration.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-canvas text-text-secondary font-semibold">
                    <th className="py-2.5 px-3">Slot</th>
                    <th className="py-2.5 px-3">Channel / Label</th>
                    <th className="py-2.5 px-3 text-right">Start Counter</th>
                    <th className="py-2.5 px-3 text-right">End Counter</th>
                    <th className="py-2.5 px-3 text-right">Usage</th>
                    <th className="py-2.5 px-3 text-right">Coverage</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Object.values(report.totals.channels).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-text-secondary">
                        No configured channels reporting for selected interval.
                      </td>
                    </tr>
                  ) : (
                    Object.values(report.totals.channels).map((ch) => (
                      <tr key={ch.channelId} className="hover:bg-canvas/50 transition-colors font-mono">
                        <td className="py-3 px-3 font-semibold text-brand-gold-text">
                          {ch.displaySlot ? `CH0${ch.displaySlot}` : '—'}
                        </td>
                        <td className="py-3 px-3 font-sans font-medium text-text-primary">
                          {ch.label}
                          <span className="block text-[11px] text-text-secondary font-mono">{ch.channelId}</span>
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-text-secondary">
                          {ch.startCounter ?? '—'}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums text-text-secondary">
                          {ch.endCounter ?? '—'}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums font-semibold text-text-primary">
                          {ch.usageKwh !== null ? `${ch.usageKwh} kWh` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          {`${(ch.coverage.timeCoveredFraction * 100).toFixed(1)}%`}
                        </td>
                        <td className="py-3 px-3 text-center font-sans">
                          {ch.usageKwh !== null ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Calculated</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 font-semibold">
                              <span>Tokens</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
