import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../components';
import { useAuth } from '../auth/AuthContext';
import { API_BASE } from '../api';
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

const lightSurface: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  boxShadow: 'var(--shadow-card)',
};

const metricBoxStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '20px 24px',
  borderTop: '2px solid var(--accent)',
  boxShadow: 'var(--shadow-card)',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  color: 'var(--text-secondary)',
};

const metricValue: React.CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: '1.75rem',
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1.1,
};

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  color: 'var(--text-secondary)',
  fontWeight: 700,
  textTransform: 'uppercase',
  fontSize: 10,
  letterSpacing: '0.1em',
};

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
        ? `${API_BASE}/api/v1/sites/${user.siteId}/devices/${selectedDevice}/reports/daily?date=${dateStr}`
        : `${API_BASE}/api/v1/sites/${user.siteId}/devices/${selectedDevice}/reports/monthly?month=${dateStr}`;

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
      <div
        style={{
          ...lightSurface,
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Certified Periodic Reports &amp; Tariffs
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            Defensible civil interval aggregation, boundary gap detection, and explicit billing suppression disclosures.
          </p>
        </div>

        {report && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                background: 'var(--canvas)',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                fontFamily: 'monospace',
              }}
            >
              <Clock style={{ width: 13, height: 13, color: 'var(--accent)' }} aria-hidden="true" />
              <span>{`Revision: v${report.revision}`}</span>
            </span>
            <span
              style={{
                display: 'inline-block',
                padding: '3px 8px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 700,
                background: 'rgba(23,99,68,0.12)',
                color: 'var(--status-ok, #176344)',
                border: '1px solid rgba(23,99,68,0.25)',
              }}
            >
              {report.status.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Control Card: Period, Date, Timezone */}
      <div
        style={{
          ...lightSurface,
          padding: '12px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          fontSize: 12,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar style={{ width: 15, height: 15, color: 'var(--accent)' }} aria-hidden="true" />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Period:</span>
            <div
              style={{
                display: 'inline-flex',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--canvas)',
                padding: 2,
                gap: 2,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setPeriodType('daily');
                  setDateStr('2026-10-16');
                }}
                style={{
                  padding: '4px 12px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: periodType === 'daily' ? 'var(--surface)' : 'transparent',
                  color: periodType === 'daily' ? 'var(--accent-text)' : 'var(--text-secondary)',
                  boxShadow: periodType === 'daily' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => {
                  setPeriodType('monthly');
                  setDateStr('2026-10');
                }}
                style={{
                  padding: '4px 12px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: periodType === 'monthly' ? 'var(--surface)' : 'transparent',
                  color: periodType === 'monthly' ? 'var(--accent-text)' : 'var(--text-secondary)',
                  boxShadow: periodType === 'monthly' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                Monthly
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Target:</span>
            <input
              type={periodType === 'daily' ? 'date' : 'month'}
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              style={{
                padding: '5px 10px',
                background: 'var(--canvas)',
                border: '1px solid var(--border-strong)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: 12,
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
            <span>Timezone:</span>
            <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>Asia/Kolkata (UTC+05:30)</strong>
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
      </div>

      {/* Degraded Error */}
      {error && (
        <div
          style={{
            padding: 16,
            background: 'var(--status-warn-bg, rgba(128,83,0,0.08))',
            border: '1px solid var(--status-warn, #805300)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 12,
            color: 'var(--status-warn, #805300)',
          }}
        >
          <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Non-negotiable Billing Suppression Notice (R12, R13, T17) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: 16,
          background: 'rgba(128,83,0,0.06)',
          border: '1px solid rgba(128,83,0,0.20)',
          borderRadius: 10,
          fontSize: 12,
          color: 'var(--text-primary)',
        }}
      >
        <AlertOctagon style={{ width: 18, height: 18, color: 'var(--accent-text)', flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontWeight: 700, color: 'var(--accent-text)' }}>
            Contract Notice: Verified Billing Calculation Suppressed
          </span>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            {report?.totals.billingSuppressionNotice ||
              'ESP32 raw legacy packets supply cumulative energy as uncalibrated tokens without verified tariff approval or certified calibration evidence. Verified currency calculations are strictly suppressed.'}
          </p>
        </div>
      </div>

      {report && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div style={metricBoxStyle}>
              <span style={sectionLabel}>Coverage Fraction</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={metricValue}>
                  {`${(report.coverage.timeCoveredFraction * 100).toFixed(1)}%`}
                </span>
                <span style={{ fontSize: 11, color: 'var(--accent-text)', fontWeight: 700, textTransform: 'capitalize' }}>
                  {report.coverage.boundaryQuality.replace('_', ' ')}
                </span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: 4 }}>
                {`${report.coverage.receivedSampleCount} / ${report.coverage.expectedSampleCount} samples`}
              </span>
            </div>

            <div style={metricBoxStyle}>
              <span style={sectionLabel}>Identified Gaps</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={metricValue}>{report.coverage.gaps.length}</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>intervals</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                {report.coverage.gaps.length === 0 ? 'Zero missing packet timeouts' : 'Discontinuous data'}
              </span>
            </div>

            <div style={metricBoxStyle}>
              <span style={sectionLabel}>Verified Consumption</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={metricValue}>
                  {report.totals.totalUsageKwh !== null ? `${report.totals.totalUsageKwh} kWh` : '—'}
                </span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                {report.totals.totalUsageKwh !== null ? 'Sum of verified channels' : 'Uncalibrated tokens'}
              </span>
            </div>

            <div style={metricBoxStyle}>
              <span style={sectionLabel}>Certified Utility Cost</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={metricValue}>
                  {report.totals.costEstimateInr !== null ? `₹${report.totals.costEstimateInr}` : '—'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--status-warn, #805300)', fontWeight: 700 }}>
                  {report.totals.isCostVerified ? 'Verified' : 'Suppressed'}
                </span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                {report.totals.isCostVerified ? 'Approved Tariff' : 'Requires tariff certification'}
              </span>
            </div>
          </div>

          {/* Channel Detail Table */}
          <div style={{ ...lightSurface, padding: '20px 24px' }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Channel Usage &amp; Counter Delta Breakdown
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                Calculated strictly across verified epochs without synthetic interpolation or proration.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-strong)', background: 'var(--surface-raised, #F0F1EC)' }}>
                    <th style={thStyle}>Slot</th>
                    <th style={thStyle}>Channel / Label</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Start Counter</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>End Counter</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Usage</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Coverage</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(report.totals.channels).length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '32px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No configured channels reporting for selected interval.
                      </td>
                    </tr>
                  ) : (
                    Object.values(report.totals.channels).map((ch) => (
                      <tr key={ch.channelId} style={{ borderBottom: '1px solid var(--border)', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                        <td style={{ padding: '12px', fontWeight: 700, color: 'var(--accent-text)' }}>
                          {ch.displaySlot ? `CH0${ch.displaySlot}` : '—'}
                        </td>
                        <td style={{ padding: '12px', fontFamily: 'sans-serif', fontWeight: 500 }}>
                          {ch.label}
                          <span style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{ch.channelId}</span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>
                          {ch.startCounter ?? '—'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>
                          {ch.endCounter ?? '—'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {ch.usageKwh !== null ? `${ch.usageKwh} kWh` : '—'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {`${(ch.coverage.timeCoveredFraction * 100).toFixed(1)}%`}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'sans-serif' }}>
                          {ch.usageKwh !== null ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 700,
                                background: 'rgba(23,99,68,0.12)',
                                color: 'var(--status-ok, #176344)',
                              }}
                            >
                              <CheckCircle2 style={{ width: 12, height: 12 }} />
                              <span>Calculated</span>
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 10,
                                fontWeight: 700,
                                background: 'rgba(128,83,0,0.12)',
                                color: 'var(--status-warn, #805300)',
                              }}
                            >
                              Tokens
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
