import React, { useMemo, useState, useEffect } from 'react';
import { Activity, Cpu, ChevronDown, ChevronUp, Bell, Zap, ZapOff } from 'lucide-react';
import type { useLiveTelemetry } from '../live/useLiveTelemetry';
import { FreshnessLabel, MeasurementChart } from '../components';
import { useOptionalAuth } from '../auth/AuthContext';
import { API_BASE } from '../api';
import type { IncidentRecord } from '@minsakthi/contracts';

export interface OverviewProps {
  telemetry: ReturnType<typeof useLiveTelemetry>;
  selectedDevice: string;
  onNavigate?: (route: string) => void;
}

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

const metricSubtext: React.CSSProperties = {
  color: 'var(--text-dim)',
  fontSize: 11,
  marginTop: 4,
};

export const Overview: React.FC<OverviewProps> = ({
  telemetry,
  selectedDevice,
  onNavigate,
}) => {
  const auth = useOptionalAuth();
  const user = auth?.user ?? null;
  const accessToken = auth?.accessToken;
  const [recentIncident, setRecentIncident] = useState<IncidentRecord | null>(null);
  const [activeAlertCount,setActiveAlertCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.siteId || !accessToken) return;
    let mounted = true;
    setRecentIncident(null);
    setActiveAlertCount(null);
    void fetch(`${API_BASE}/api/v1/sites/${user.siteId}/alerts?deviceId=${encodeURIComponent(selectedDevice)}`,
      {headers:{Authorization:`Bearer ${accessToken}`}}).then(async response => {
        if (!response.ok) return;
        const data = await response.json();
        if (mounted) setActiveAlertCount((data.alerts ?? []).filter((alert: {state:string}) => alert.state === 'open').length);
      }).catch(() => {});
    async function loadRecentIncident() {
      try {
        const res = await fetch(
          `${API_BASE}/api/v1/sites/${user!.siteId}/incidents?deviceId=${encodeURIComponent(selectedDevice)}&limit=1`,
          { headers:{Authorization:`Bearer ${accessToken}`} }
        );
        if (res.ok) {
          const data = (await res.json()) as { incidents?: IncidentRecord[] };
          if (mounted && data.incidents && data.incidents[0]) {
            setRecentIncident(data.incidents[0]);
          } else if (mounted) {
            setRecentIncident(null);
          }
        }
      } catch {
        if (mounted) setRecentIncident(null);
      }
    }
    loadRecentIncident();
    return () => {
      mounted = false;
    };
  }, [user?.siteId, accessToken, selectedDevice]);

  const {
    channels,
    health,
    coverage,
    powerHistory,
    lastDisplayLatencyMs,
    streamStatus,
  } = telemetry;

  const [measurementsExpanded, setMeasurementsExpanded] = useState<boolean>(true);

  const dotColor = streamStatus.tone === 'positive'
    ? 'var(--status-ok, #176344)'
    : streamStatus.tone === 'critical'
      ? 'var(--status-critical, #A52E2E)'
      : streamStatus.tone === 'warning'
        ? 'var(--status-warn, #805300)'
        : 'var(--status-unknown, #5D625D)';

  // Active power total across reporting configured channels
  const { totalPower, activeCount, configuredCount } = useMemo(() => {
    let sum = 0;
    let active = 0;
    let configured = 0;

    for (const ch of channels) {
      if (ch.freshness !== 'unconfigured') {
        configured += 1;
        if (ch.lastSample && ch.freshness === 'fresh') {
          sum += ch.lastSample.values.power;
          active += 1;
        }
      }
    }

    return {
      totalPower: sum,
      activeCount: active,
      configuredCount: configured,
      isPartial: active < configured,
    };
  }, [channels]);

  // Derived honest status message for the workspace
  const honestStatusMessage = useMemo(() => {
    if (streamStatus.tone === 'critical') return 'Connection interrupted';
    if (configuredCount > 0 && activeCount === 0) return 'Waiting for readings';
    if (activeCount < configuredCount) return 'Some channels unavailable';
    return 'Receiving readings';
  }, [streamStatus.tone, configuredCount, activeCount]);

  // Voltage and Frequency ranges across reporting channels
  const { voltageRange, freqRange, totalCurrent } = useMemo(() => {
    let minV = Number.POSITIVE_INFINITY;
    let maxV = Number.NEGATIVE_INFINITY;
    let minF = Number.POSITIVE_INFINITY;
    let maxF = Number.NEGATIVE_INFINITY;
    let sumI = 0;
    let count = 0;

    for (const ch of channels) {
      if (ch.lastSample && ch.freshness === 'fresh') {
        const v = ch.lastSample.values.voltage;
        const f = ch.lastSample.values.frequency;
        const i = ch.lastSample.values.current;

        if (v < minV) minV = v;
        if (v > maxV) maxV = v;
        if (f < minF) minF = f;
        if (f > maxF) maxF = f;
        sumI += i;
        count += 1;
      }
    }

    if (count === 0) {
      return { voltageRange: '—', freqRange: '—', totalCurrent: '—' };
    }

    const vStr = minV === maxV ? `${minV.toFixed(1)} V` : `${minV.toFixed(1)} – ${maxV.toFixed(1)} V`;
    const fStr = minF === maxF ? `${minF.toFixed(2)} Hz` : `${minF.toFixed(2)} – ${maxF.toFixed(2)} Hz`;
    return {
      voltageRange: vStr,
      freqRange: fStr,
      totalCurrent: `${sumI.toFixed(2)} A`,
    };
  }, [channels]);

  // Chart series for power trends
  const chartSeries = useMemo(() => {
    const seriesColors = ['#171717', '#176B65', '#3C5D91', '#78547A', '#454B49'];
    return channels
      .filter((ch) => ch.freshness !== 'unconfigured')
      .map((ch, idx) => ({
        id: ch.rawChannelId,
        name: ch.label,
        color: seriesColors[idx % seriesColors.length] ?? '#171717',
        unit: 'W',
        data: powerHistory[ch.rawChannelId] || [],
      }));
  }, [channels, powerHistory]);

  return (
    <div className="space-y-6">
      {/* Top Status Bar: Concise real status, device name, and display ACK */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-card)',
          padding: '12px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
            <Cpu style={{ width: 14, height: 14, color: 'var(--accent)' }} aria-hidden="true" />
            <span>Device: <strong style={{ fontFamily: 'monospace', color: 'var(--accent-text)' }}>{selectedDevice}</strong></span>
          </div>
          <span style={{ color: 'var(--border)' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                display: 'inline-block',
                background: dotColor,
              }}
            />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{honestStatusMessage}</span>
            <span style={{ color: 'var(--text-secondary)' }}>({`ESP: ${streamStatus.label}`})</span>
          </div>
          <span style={{ color: 'var(--border)' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
            <span>Broker: <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{health?.broker ?? 'unknown'}</strong></span>
          </div>
        </div>

        {/* Display ACK latency */}
        {lastDisplayLatencyMs !== null && (
          <div
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
            <Activity style={{ width: 13, height: 13, color: 'var(--accent)' }} aria-hidden="true" />
            <span>Display ACK: <strong style={{ color: 'var(--text-primary)' }}>{`${lastDisplayLatencyMs}ms`}</strong></span>
          </div>
        )}
      </div>

      {/* Conditional Recent Incident Context Banner */}
      {recentIncident && (
        <div
          className="p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs"
          style={{
            background: 'rgba(217, 119, 6, 0.08)',
            borderColor: 'rgba(217, 119, 6, 0.3)',
            color: '#92400e',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <ZapOff className="w-5 h-5 flex-shrink-0 text-amber-600" aria-hidden="true" />
            <div className="min-w-0">
              <div className="font-bold text-neutral-900 truncate">{recentIncident.title}</div>
              <div className="text-neutral-600 mt-0.5 line-clamp-1">{recentIncident.summary}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.(`/insights/incidents?incidentId=${recentIncident.id}`)}
            className="flex-shrink-0 px-3 py-1.5 rounded font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent, #171717)' }}
          >
            Investigate Event →
          </button>
        </div>
      )}

      {/* Primary Content Budget: 3 Essential Cards (Power now, Channels reporting, Alerts needing attention) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Primary 1: Power Now */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            borderTop: '2px solid var(--accent)',
            boxShadow: 'var(--shadow-card)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div className="flex items-center justify-between">
            <span style={sectionLabel}>Power now</span>
            <Zap className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} aria-hidden="true" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={metricValue}>{activeCount > 0 ? totalPower.toFixed(1) : '—'}</span>
            {activeCount > 0 && (
              <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>W</span>
            )}
          </div>
          <span style={metricSubtext}>
            Active Power Total · {activeCount > 0 ? `${totalPower.toFixed(1)} W monitored` : 'No current readings'}
          </span>
        </div>

        {/* Primary 2: Channels Reporting */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            borderTop: '2px solid var(--accent)',
            boxShadow: 'var(--shadow-card)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div className="flex items-center justify-between">
            <span style={sectionLabel}>Channels reporting</span>
            <Cpu className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} aria-hidden="true" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={metricValue}>
              {coverage ? `${coverage.reportingSlots}/${coverage.configuredSlots}` : `${activeCount}/${configuredCount}`}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>slots</span>
          </div>
          <span style={metricSubtext}>
            {`${coverage?.reportingSlots ?? activeCount}/${coverage?.configuredSlots ?? configuredCount} reporting`} · {coverage?.partial ? 'Partial coverage' : 'Full reporting'}
          </span>
        </div>

        {/* Primary 3: Alerts Needing Attention */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            borderTop: '2px solid var(--accent)',
            boxShadow: 'var(--shadow-card)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div className="flex items-center justify-between">
            <span style={sectionLabel}>Alerts needing attention</span>
            <Bell className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} aria-hidden="true" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={metricValue}>{activeAlertCount ?? '—'}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>active</span>
          </div>
          <span style={metricSubtext}>
            {activeAlertCount === null ? 'Checking recorded alerts' : activeAlertCount === 0 ? 'No open alerts recorded' : 'Open alerts require review'}
          </span>
        </div>
      </div>

      {/* Secondary Electrical Measurements Detail Row (Expandable/Compact) */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
        }}
      >
        <button
          type="button"
          onClick={() => setMeasurementsExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-left transition-colors hover:bg-black/2"
          style={{ borderBottom: measurementsExpanded ? '1px solid var(--border)' : 'none' }}
          aria-expanded={measurementsExpanded}
          aria-controls="overview-measurements-detail"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Secondary Electrical Measurements
            </span>
            <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
              (Supply Voltage, Active Current, Grid Frequency)
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--accent-text)' }}>
            <span>{measurementsExpanded ? 'Collapse' : 'Expand'}</span>
            {measurementsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {measurementsExpanded && (
          <div id="overview-measurements-detail" className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)] p-2">
            <div className="px-5 py-3">
              <span style={sectionLabel}>Supply Voltage</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                <span style={{ ...metricValue, fontSize: '1.25rem' }}>{voltageRange}</span>
              </div>
              <span style={metricSubtext}>Configured channel range</span>
            </div>

            <div className="px-5 py-3">
              <span style={sectionLabel}>Active Current</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                <span style={{ ...metricValue, fontSize: '1.25rem' }}>{totalCurrent}</span>
              </div>
              <span style={metricSubtext}>Sum across reporting loads</span>
            </div>

            <div className="px-5 py-3">
              <span style={sectionLabel}>Grid Frequency</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                <span style={{ ...metricValue, fontSize: '1.25rem' }}>{freqRange}</span>
              </div>
              <span style={metricSubtext}>Monitored line frequency</span>
            </div>
          </div>
        )}
      </div>

      {/* Primary Chart: Real Active Power Trends (Receipt-Time with Gaps) */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-card)',
          padding: 16,
        }}
      >
        <MeasurementChart
          title="Active Power Trend (Receipt-Time with Gaps)"
          series={chartSeries}
          height={280}
          ariaDescription="Real-time and recent active power samples with breaks during communication gaps"
        />
      </div>

      {/* Compact Configured-Channel Content Table */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-card)',
          padding: '20px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Hardware Channel Mappings (CH01–CH05)
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Mapped per device. Missing readings are null (—); valid zero load is 0.00.
            </p>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
            Slots reporting: {activeCount}/{configuredCount}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-strong)', background: 'var(--surface-raised, #F0F1EC)' }}>
                {['Slot', 'Channel / Label', 'Voltage', 'Current', 'Power', 'Energy (Raw)', 'Freq', 'Status'].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 12px',
                      color: 'var(--text-secondary)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      textAlign: i >= 2 && i <= 6 ? 'right' : i === 7 ? 'center' : 'left',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {channels.map((ch, idx) => {
                const s = ch.freshness === 'fresh' ? ch.lastSample : null;
                const isUnconf = ch.freshness === 'unconfigured';
                return (
                  <tr
                    key={ch.displaySlot ?? idx}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      opacity: isUnconf ? 0.5 : 1,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--accent-text)', fontFamily: 'monospace' }}>
                      {`CH0${ch.displaySlot ?? idx + 1}`}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {ch.label}
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {ch.rawChannelId}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>
                      {s?.values.voltage != null ? `${s.values.voltage.toFixed(2)} V` : '—'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>
                      {s?.values.current != null ? `${s.values.current.toFixed(2)} A` : '—'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {s?.values.power != null ? `${s.values.power.toFixed(2)} W` : '—'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>
                      {s?.values.energyRaw != null ? s.values.energyRaw : '—'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>
                      {s?.values.frequency != null ? `${s.values.frequency.toFixed(2)} Hz` : '—'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <FreshnessLabel freshness={ch.freshness} lastReceivedAt={ch.lastReceivedAt} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
