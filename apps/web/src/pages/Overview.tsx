import React, { useMemo, useState, useEffect } from 'react';
import { Activity, Cpu, ChevronDown, ChevronUp, Bell, Zap, ZapOff, ArrowUpRight, Radio, ArrowRight } from 'lucide-react';
import type { useLiveTelemetry } from '../live/useLiveTelemetry';
import { FreshnessLabel, MeasurementChart } from '../components';
import { useOptionalAuth } from '../auth/AuthContext';
import { API_BASE } from '../api';
import type { IncidentRecord } from '@minsakthi/contracts';
import './overview.css';

export interface OverviewProps {
  telemetry: ReturnType<typeof useLiveTelemetry>;
  selectedDevice: string;
  onNavigate?: (route: string) => void;
}

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

  const [trendMetric, setTrendMetric] = useState<'power' | 'current' | 'voltage'>('power');

  // Standard Indian commercial/domestic electricity tariff: ₹7.50 / kWh
  const TARIFF_INR_PER_KWH = 7.50;

  // Active power total across reporting configured channels
  const { totalPower, activeCount, configuredCount } = useMemo(() => {
    let sum = 0;
    let active = 0;
    let configured = 0;

    for (const ch of channels) {
      if (ch.freshness !== 'unconfigured') {
        configured += 1;
        if (ch.lastSample && (ch.freshness === 'fresh' || ch.freshness === 'stale')) {
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

  const liveCostPerHour = (totalPower / 1000) * TARIFF_INR_PER_KWH;
  const sevenDayProjectedCost = ((totalPower * 24 * 7) / 1000) * TARIFF_INR_PER_KWH;

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
      if (ch.lastSample && (ch.freshness === 'fresh' || ch.freshness === 'stale')) {
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

  // Chart series for power, current, or voltage trends
  const chartSeries = useMemo(() => {
    const seriesColors = ['#171717', '#176B65', '#3C5D91', '#78547A', '#454B49'];
    const currentHist = (telemetry as { currentHistory?: Record<string, Array<{ timestamp: string; value: number | null }>> }).currentHistory || {};
    const voltageHist = (telemetry as { voltageHistory?: Record<string, Array<{ timestamp: string; value: number | null }>> }).voltageHistory || {};
    const historySource = trendMetric === 'current'
      ? currentHist
      : trendMetric === 'voltage'
        ? voltageHist
        : powerHistory;
    const unit = trendMetric === 'current' ? 'A' : trendMetric === 'voltage' ? 'V' : 'W';

    return channels
      .filter((ch) => ch.freshness !== 'unconfigured')
      .map((ch, idx) => ({
        id: ch.rawChannelId,
        name: ch.label,
        color: seriesColors[idx % seriesColors.length] ?? '#171717',
        unit,
        data: historySource[ch.rawChannelId] || [],
      }));
  }, [channels, powerHistory, telemetry, trendMetric]);

  const reporting = coverage?.reportingSlots ?? activeCount;
  const configured = coverage?.configuredSlots ?? configuredCount;
  const hasTrend = chartSeries.some(series => series.data.some(point => point.value !== null));

  return (
    <div className="overview-dashboard">
      <header className="overview-heading">
        <div>
          <p className="overview-eyebrow">YOUR ENERGY, AT A GLANCE</p>
          <h1>Workspace overview<span>.</span></h1>
          <p className="overview-description">A clear view of your power and connected channels.</p>
        </div>
        <div className="overview-device-state">
          <span className="overview-status-dot" style={{ background: dotColor }} />
          <div><strong>{honestStatusMessage}</strong><span>{selectedDevice} · {`ESP: ${streamStatus.label}`}</span></div>
        </div>
      </header>

      {/* Conditional Recent Incident Context Banner */}
      {recentIncident && (
        <div
          className="p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <ZapOff className="w-5 h-5 flex-shrink-0 text-neutral-700" aria-hidden="true" />
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

      <section className="overview-metrics" aria-label="Energy summary">
        <article className="overview-power-panel">
          <div className="overview-card-top"><span>Power now</span><span className="overview-icon-tile"><Zap size={19} aria-hidden="true" /></span></div>
          <div className="overview-power-value"><span>{activeCount > 0 ? totalPower.toFixed(1) : '—'}</span><small>W</small></div>
          <div className="overview-power-footer">
            <span>{activeCount > 0 ? `${totalPower.toFixed(1)} W monitored` : 'No current readings'}</span>
            <span className="overview-power-tag">{activeCount > 0 ? 'Live measurement' : 'Awaiting device'}</span>
          </div>
          <Zap className="overview-power-watermark" aria-hidden="true" />
        </article>

        <article className="overview-stat-panel overview-cost-panel">
          <div className="overview-card-top">
            <span>Power Cost (₹)</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: 6,
                background: 'rgba(200, 169, 110, 0.16)',
                color: '#8f6810',
                fontWeight: 700,
                fontSize: 10,
                letterSpacing: '0.06em',
              }}
            >
              ₹ INR
            </span>
          </div>
          <div className="overview-stat-value">
            <span style={{ fontSize: 26, marginRight: 2, color: 'var(--text-dim)' }}>₹</span>
            {activeCount > 0 ? liveCostPerHour.toFixed(2) : '0.00'}
            <small>/hr</small>
          </div>
          <div className="overview-card-bottom">
            <span style={{ fontWeight: 600 }}>
              {activeCount > 0
                ? `Last 7 days: ~₹${sevenDayProjectedCost.toFixed(0)} used`
                : 'Waiting for active power'}
            </span>
            <span
              style={{
                fontSize: 10,
                color: 'var(--text-secondary)',
                background: 'var(--surface-inset)',
                padding: '3px 7px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
              }}
            >
              @ ₹7.50/unit
            </span>
          </div>
        </article>

        <article className="overview-stat-panel">
          <div className="overview-card-top"><span>Channels reporting</span><Cpu size={18} aria-hidden="true" /></div>
          <div className="overview-stat-value">{reporting}<span>/{configured}</span></div>
          <div className="overview-slot-indicators" aria-hidden="true">
            {channels.map((ch, index) => <span key={ch.rawChannelId || index} data-reporting={ch.freshness === 'fresh'} />)}
          </div>
          <div className="overview-card-bottom"><span>{`${reporting}/${configured} reporting`} · {reporting < configured ? 'Partial coverage' : configured > 0 ? 'Full reporting' : 'No configured channels'}</span><button type="button" onClick={() => onNavigate?.('/channels')} aria-label="View channels"><ArrowUpRight size={18} /></button></div>
        </article>

        <article className="overview-stat-panel">
          <div className="overview-card-top"><span>Alerts needing attention</span><Bell size={18} aria-hidden="true" /></div>
          <div className="overview-stat-value">{activeAlertCount ?? '—'}<small>open</small></div>
          <div className="overview-card-bottom"><span>{activeAlertCount === null ? 'Checking recorded alerts' : activeAlertCount === 0 ? 'No open alerts recorded' : 'Open alerts require review'}</span><button type="button" onClick={() => onNavigate?.('/alerts')} aria-label="View alerts"><ArrowUpRight size={18} /></button></div>
        </article>
      </section>

      <section className="overview-measurements">
        <button type="button" className="overview-measurements-toggle" onClick={() => setMeasurementsExpanded(v => !v)} aria-expanded={measurementsExpanded} aria-controls="overview-measurements-detail">
          <span><Activity size={16} aria-hidden="true" />Secondary Electrical Measurements</span>
          {measurementsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {measurementsExpanded && <div id="overview-measurements-detail" className="overview-measurements-grid">
          {[['Supply Voltage', voltageRange, 'Across reporting channels'], ['Active Current', totalCurrent, 'Combined load'], ['Grid Frequency', freqRange, 'Monitored line frequency']].map(([label, value, note]) => (
            <div key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
          ))}
        </div>}
      </section>

      <div className="overview-monitoring-grid">
        <section className="overview-trend-panel">
          <div className="overview-section-heading">
            <div>
              <p className="overview-eyebrow">
                {trendMetric === 'current' ? 'CURRENT OVER TIME' : trendMetric === 'voltage' ? 'VOLTAGE OVER TIME' : 'POWER OVER TIME'}
              </p>
              <h2>{trendMetric === 'current' ? 'Active Current Trend' : trendMetric === 'voltage' ? 'Voltage Trend' : 'Active Power Trend'}</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', background: 'var(--surface-inset)', borderRadius: 8, padding: 3, gap: 3 }}>
                {(['power', 'current', 'voltage'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTrendMetric(m)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 6,
                      border: 'none',
                      cursor: 'pointer',
                      background: trendMetric === m ? 'var(--surface)' : 'transparent',
                      color: trendMetric === m ? 'var(--accent-text)' : 'var(--text-secondary)',
                      boxShadow: trendMetric === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {m === 'power' ? 'Power (W)' : m === 'current' ? 'Current (A)' : 'Voltage (V)'}
                  </button>
                ))}
              </div>
              <span className="overview-subtle-badge">{activeCount > 0 ? 'Receiving data' : 'Device not reporting'}</span>
            </div>
          </div>
          {hasTrend ? (
            <MeasurementChart
              title={trendMetric === 'current' ? 'Channel current · A' : trendMetric === 'voltage' ? 'Channel voltage · V' : 'Channel power · W'}
              series={chartSeries}
              height={235}
              framed={false}
              curveType="natural"
              ariaDescription="Recent electrical samples with smooth continuous spline response and breaks during communication gaps"
            />
          ) : (
            <div className="overview-chart-empty">
              <div className="overview-empty-icon"><Radio size={26} strokeWidth={1.5} aria-hidden="true" /></div>
              <h3>Ready when your device is.</h3>
              <p>Power readings will appear here as soon as the ESP sends data.</p>
              <span>Missing readings stay blank. A measured zero stays zero.</span>
            </div>
          )}
          <footer className="overview-trend-footer"><span className="overview-status-dot" style={{ background: dotColor }} /><span>{activeCount > 0 ? 'Live readings · communication gaps remain visible' : 'Waiting for fresh telemetry'}</span>{lastDisplayLatencyMs !== null && <span className="overview-latency">Display ACK: {`${lastDisplayLatencyMs}ms`}</span>}</footer>
        </section>

        <aside className="overview-channel-panel">
          <div className="overview-section-heading"><div><p className="overview-eyebrow">CONNECTED HARDWARE</p><h2>Your channels</h2></div><Cpu size={19} aria-hidden="true" /></div>
          <div className="overview-channel-list">
            {channels.map((ch, index) => <div className="overview-channel-row" key={ch.rawChannelId || index}>
              <span className="overview-channel-number">{String(ch.displaySlot ?? index + 1).padStart(2, '0')}</span>
              <div><strong>{ch.label}</strong><span>{ch.freshness === 'fresh' ? 'Reporting' : ch.freshness === 'unconfigured' ? 'Not configured' : 'No fresh readings'}</span></div>
              <span className="overview-channel-reading">{ch.freshness === 'fresh' && ch.lastSample ? `${ch.lastSample.values.power.toFixed(1)} W` : '—'}</span>
            </div>)}
          </div>
          <button className="overview-text-action" type="button" onClick={() => onNavigate?.('/channels')}>View all channels<ArrowRight size={16} aria-hidden="true" /></button>
        </aside>
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
              Live electrical readings for each mapped channel.
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
                {['Slot', 'Channel / Label', 'Voltage', 'Current', 'Power', 'Energy (Raw)', 'Freq', 'Est. Cost (₹ / 7d)', 'Status'].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 12px',
                      color: 'var(--text-secondary)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      textAlign: i >= 2 && i <= 7 ? 'right' : i === 8 ? 'center' : 'left',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {channels.map((ch, idx) => {
                const s = (ch.freshness === 'fresh' || ch.freshness === 'stale') ? ch.lastSample : null;
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
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>
                      {s?.values.power != null ? (
                        <div>
                          <span style={{ fontWeight: 600, color: '#926c15' }}>
                            {`₹${((s.values.power / 1000) * TARIFF_INR_PER_KWH).toFixed(2)}/hr`}
                          </span>
                          <span style={{ display: 'block', fontSize: 10, color: 'var(--text-secondary)' }}>
                            {`7d: ~₹${(((s.values.power * 24 * 7) / 1000) * TARIFF_INR_PER_KWH).toFixed(1)}`}
                          </span>
                        </div>
                      ) : '—'}
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
