import React, { useMemo, useState, useEffect } from 'react';
import { Activity, Cpu, ChevronDown, ChevronUp, Bell, Zap, ZapOff, ArrowUpRight, Radio, ArrowRight, Check, Clock3 } from 'lucide-react';
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

  // Illustrative rate for cost estimates, not a verified electricity tariff.
  const TARIFF_INR_PER_KWH = 7.50;

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

  const liveCostPerHour = (totalPower / 1000) * TARIFF_INR_PER_KWH;


  // Derived honest status message for the workspace
  const honestStatusMessage = useMemo(() => {
    if (streamStatus.tone !== 'positive') return streamStatus.label;
    if (configuredCount === 0) return 'Waiting for channel setup';
    if (activeCount === 0) return 'Waiting for readings';
    if (activeCount < configuredCount) return 'Some channels unavailable';
    return 'Receiving readings';
  }, [streamStatus.tone, streamStatus.label, configuredCount, activeCount]);

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

  // Chart series for power, current, or voltage trends
  const chartSeries = useMemo(() => {
    const seriesColors = ['#344757', '#3f6088', '#8f6810', '#72598b', '#507b87'];
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
  const hasSnapshot = telemetry.snapshot !== null || channels.length > 0;
  const canManage = user?.role === 'admin';
  const channelSlots = Array.from({ length: 5 }, (_, index) => ({
    slot: index + 1,
    channel: channels.find(channel => channel.displaySlot === index + 1),
  }));

  return (
    <div className="overview-dashboard">
      <header className="overview-heading">
        <div>
          <p className="overview-eyebrow"><span /> ENERGY WORKSPACE <span className="overview-heading-divider">/</span> OVERVIEW</p>
          <h1>Your energy, in focus<span>.</span></h1>
          <p className="overview-description">One place for your power, your channels, and what needs attention.</p>
        </div>
        <div className="overview-heading-actions">
          <div className="overview-device-state" role="status">
            <span className="overview-status-dot" style={{ background: dotColor }} />
            <div><strong>{honestStatusMessage}</strong><span>{selectedDevice}</span></div>
          </div>
          <button type="button" className="overview-history-action" onClick={() => onNavigate?.('/insights/history')}><Clock3 size={15} aria-hidden="true" /> View history<ArrowUpRight size={14} aria-hidden="true" /></button>
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
            <span>{activeCount > 0 ? `Across ${activeCount} reporting ${activeCount === 1 ? 'channel' : 'channels'}` : 'Waiting for fresh measurements'}</span>
            <span className="overview-power-tag">{activeCount > 0 ? 'Live measurement' : 'Awaiting device'}</span>
          </div>
          <Zap className="overview-power-watermark" aria-hidden="true" />
        </article>

        <article className="overview-stat-panel overview-cost-panel">
          <div className="overview-card-top">
            <span>Estimated cost rate</span>
            <span className="overview-currency-badge">₹ INR</span>
          </div>
          <div className="overview-stat-value">
            <span style={{ fontSize: 26, marginRight: 2, color: 'var(--text-dim)' }}>₹</span>
            {activeCount > 0 ? liveCostPerHour.toFixed(2) : '—'}
            <small>/hr</small>
          </div>
          <div className="overview-card-bottom overview-cost-footer">
            <span>
              {activeCount > 0
                ? 'At an illustrative rate of 7.50 INR/kWh'
                : 'Waiting for active power'}
            </span>
            <button
              type="button"
              onClick={() => onNavigate?.('/energy')}
              aria-label="View detailed energy usage and history"
              className="overview-usage-action"
            >
              <span>Usage details</span>
              <ArrowRight size={12} aria-hidden="true" />
            </button>
          </div>
        </article>

        <article className="overview-stat-panel">
          <div className="overview-card-top"><span>Channels reporting</span><Cpu size={18} aria-hidden="true" /></div>
          <div className="overview-stat-value">{hasSnapshot ? reporting : '—'}{hasSnapshot && <span>/{configured}</span>}</div>
          <div className="overview-slot-indicators" aria-hidden="true">
            {channelSlots.map(({ slot, channel }) => <span key={slot} data-reporting={channel?.freshness === 'fresh'} />)}
          </div>
          <div className="overview-card-bottom"><span>{!hasSnapshot ? 'Checking channel configuration' : configured === 0 ? 'No configured channels' : `${reporting}/${configured} reporting · ${reporting < configured ? 'Partial coverage' : 'Full reporting'}`}</span><button type="button" onClick={() => onNavigate?.('/channels')} aria-label="View channels"><ArrowUpRight size={18} /></button></div>
        </article>

        <article className="overview-stat-panel">
          <div className="overview-card-top"><span>Alerts needing attention</span><Bell size={18} aria-hidden="true" /></div>
          <div className="overview-stat-value">{activeAlertCount ?? '—'}<small>open</small></div>
          <div className="overview-card-bottom"><span>{activeAlertCount === null ? 'Checking recorded alerts' : activeAlertCount === 0 ? 'No open alerts recorded' : 'Open alerts require review'}</span><button type="button" onClick={() => onNavigate?.('/alerts')} aria-label="View alerts"><ArrowUpRight size={18} /></button></div>
        </article>
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
              <div className="overview-chart-tabs" role="group" aria-label="Trend measurement">
                {[
                  { id: 'power', label: 'Power (W)' },
                  { id: 'current', label: 'Current (A)' },
                  { id: 'voltage', label: 'Voltage (V)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={trendMetric === item.id}
                    onClick={() => setTrendMetric(item.id as 'power' | 'current' | 'voltage')}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {hasTrend ? (
            <MeasurementChart
              title={
                trendMetric === 'current'
                  ? 'Channel current · A'
                  : trendMetric === 'voltage'
                    ? 'Channel voltage · V'
                    : 'Channel power · W'
              }
              series={chartSeries}
              height={265}
              framed={false}
              timeWindowSeconds={120}
              gapThresholdMs={(telemetry.snapshot?.expectedIntervalMs ?? 5000) * 3}
              ariaDescription="Recorded electrical measurements with visible breaks during communication gaps"
            />
          ) : (
            <div className="overview-chart-empty">
              <div className="overview-empty-icon"><Radio size={25} strokeWidth={1.5} aria-hidden="true" /></div>
              <span className="overview-empty-kicker">YOUR MONITORING STARTS HERE</span>
              <h3>{activeCount > 0 ? 'Building your trend.' : 'A clear picture starts with a reading.'}</h3>
              <p>{activeCount > 0 ? 'Fresh measurements are arriving. This trend fills in as samples are collected.' : hasSnapshot && configuredCount === 0 ? 'Configure your device channels to start monitoring voltage, current, and power.' : 'Your chart will build automatically when fresh measurements arrive from your device.'}</p>
              <ol className="overview-readiness" aria-label="Monitoring readiness">
                {[['Device selected', Boolean(selectedDevice)], ['Channels configured', configuredCount > 0], ['Fresh readings', activeCount > 0]].map(([label, ready], index) => (
                  <li key={String(label)} data-ready={Boolean(ready)}><span>{ready ? <Check size={12} aria-hidden="true" /> : String(index + 1).padStart(2, '0')}</span>{label}</li>
                ))}
              </ol>
              {onNavigate && <button type="button" className="overview-empty-action" onClick={() => onNavigate(canManage && hasSnapshot && configuredCount === 0 ? '/manage/devices' : '/channels')}>{canManage && hasSnapshot && configuredCount === 0 ? 'Configure channels' : 'View channel status'}<ArrowRight size={14} aria-hidden="true" /></button>}
            </div>
          )}
          <footer className="overview-trend-footer"><span className="overview-status-dot" style={{ background: dotColor }} /><span>{activeCount > 0 ? 'Fresh measurements · gaps remain visible' : honestStatusMessage}</span><span className="overview-chart-window">Latest 2 minutes</span></footer>
        </section>

        <aside className="overview-channel-panel">
          <div className="overview-section-heading"><div><p className="overview-eyebrow">FIVE CHANNELS. ONE VIEW.</p><h2>Channel activity</h2></div><span className="overview-channel-count">{hasSnapshot ? `${reporting} / ${configured}` : '— / 5'}</span></div>
          <div className="overview-channel-list">
            {channelSlots.map(({ slot, channel: ch }) => <div className="overview-channel-row" key={slot} data-reporting={ch?.freshness === 'fresh'}>
              <span className="overview-channel-number">{String(slot).padStart(2, '0')}</span>
              <div><strong>{ch?.label ?? `Channel ${String(slot).padStart(2, '0')}`}</strong><span><i />{!hasSnapshot ? 'Checking configuration' : !ch || ch.freshness === 'unconfigured' ? 'Not configured' : ch.freshness === 'fresh' ? 'Reporting' : 'No fresh readings'}</span></div>
              <span className="overview-channel-reading">{ch?.freshness === 'fresh' && ch.lastSample ? <>{ch.lastSample.values.power.toFixed(1)} <small>W</small></> : '—'}</span>
            </div>)}
          </div>
          <div className="overview-channel-note"><Cpu size={15} aria-hidden="true" /><span>{hasSnapshot ? `${configured} of 5 slots configured` : 'Channel details appear after device sync'}</span></div>
          <button className="overview-text-action" type="button" onClick={() => onNavigate?.('/channels')}>View all channels<ArrowRight size={16} aria-hidden="true" /></button>
        </aside>
      </div>

      <section className="overview-measurements">
        <button type="button" className="overview-measurements-toggle" onClick={() => setMeasurementsExpanded(v => !v)} aria-expanded={measurementsExpanded} aria-controls="overview-measurements-detail">
          <span><Activity size={16} aria-hidden="true" />Electrical snapshot</span>
          {measurementsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {measurementsExpanded && <div id="overview-measurements-detail" className="overview-measurements-grid">
          {[['Supply voltage', voltageRange, 'Across reporting channels'], ['Active current', totalCurrent, 'Combined load'], ['Grid frequency', freqRange, 'Monitored line frequency']].map(([label, value, note]) => (
            <div key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
          ))}
        </div>}
      </section>

      {/* Compact Configured-Channel Content Table */}
      <details className="overview-channel-details">
        <summary><span><Cpu size={16} aria-hidden="true" />Detailed channel readings</span><span>CH01–CH05 <ChevronDown size={15} aria-hidden="true" /></span></summary>
        <div className="overview-details-content">
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
                {['Slot', 'Channel / Label', 'Voltage', 'Current', 'Power', 'Energy (Raw)', 'Freq', 'Est. rate (₹/hr)', 'Status'].map((h, i) => (
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
              {channels.length === 0 && <tr><td colSpan={9} className="overview-table-empty">Channel measurements will appear after your device configuration is received.</td></tr>}
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
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>
                      {s?.values.power != null ? (
                        <div>
                          <span style={{ fontWeight: 600, color: '#926c15' }}>
                            {`₹${((s.values.power / 1000) * TARIFF_INR_PER_KWH).toFixed(2)}/hr`}
                          </span>
                          <span style={{ display: 'block', fontSize: 10, color: 'var(--text-secondary)' }}>
                            At ₹7.50/kWh
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
      </details>
    </div>
  );
};
