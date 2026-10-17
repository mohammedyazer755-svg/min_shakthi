import React, { useState, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { useLiveTelemetry } from '../live/useLiveTelemetry';
import { TimeRangePicker, type TimeRange, MeasurementChart } from '../components';

export interface OverallAnalyticsProps {
  telemetry: ReturnType<typeof useLiveTelemetry>;
  selectedDevice: string;
}

const darkSurface: React.CSSProperties = {
  background: 'var(--dark-surface)',
  border: '1px solid var(--dark-border)',
  borderRadius: 12,
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  color: 'var(--dark-text-muted)',
};

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  color: 'var(--dark-text-muted)',
  fontWeight: 700,
  textTransform: 'uppercase',
  fontSize: 10,
  letterSpacing: '0.1em',
};

export const OverallAnalytics: React.FC<OverallAnalyticsProps> = ({
  telemetry,
  selectedDevice,
}) => {
  const { channels, powerHistory } = telemetry;
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');

  // Channel chart series
  const chartSeries = useMemo(() => {
    const seriesColors = ['#80601E', '#176B65', '#3C5D91', '#78547A', '#454B49'];
    return channels
      .filter((ch) => ch.freshness !== 'unconfigured')
      .map((ch, idx) => ({
        id: ch.rawChannelId,
        name: ch.label,
        color: seriesColors[idx % seriesColors.length] ?? '#80601E',
        unit: 'W',
        data: powerHistory[ch.rawChannelId] || [],
      }));
  }, [channels, powerHistory]);

  // Aggregate channel statistics
  const channelStats = useMemo(() => {
    const totalCurrentPower = channels.reduce((sum, ch) => {
      return sum + (ch.freshness === 'fresh' ? ch.lastSample?.values.power ?? 0 : 0);
    }, 0);

    return channels
      .filter((ch) => ch.freshness !== 'unconfigured')
      .map((ch) => {
        const hist = powerHistory[ch.rawChannelId] || [];
        const sampleCount = hist.length;
        const currentPower = ch.freshness === 'fresh' ? ch.lastSample?.values.power ?? null : null;
        const pct = currentPower !== null && totalCurrentPower > 0 ? (currentPower / totalCurrentPower) * 100 : null;

        let minP = Number.POSITIVE_INFINITY;
        let maxP = Number.NEGATIVE_INFINITY;
        for (const p of hist) {
          if (p.value !== null) {
            if (p.value < minP) minP = p.value;
            if (p.value > maxP) maxP = p.value;
          }
        }

        return {
          channelId: ch.rawChannelId,
          displaySlot: ch.displaySlot,
          label: ch.label,
          currentPower,
          minPower: minP === Number.POSITIVE_INFINITY ? null : minP,
          maxPower: maxP === Number.NEGATIVE_INFINITY ? null : maxP,
          sampleCount,
          pct: pct?.toFixed(1) ?? null,
          freshness: ch.freshness,
        };
      });
  }, [channels, powerHistory]);

  return (
    <div className="space-y-6">
      {/* Analytics Header Controls */}
      <div
        style={{
          ...darkSurface,
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Overall Energy &amp; Load Analytics
          </h2>
          <p style={{ fontSize: 12, color: 'var(--dark-text-muted)', marginTop: 2 }}>
            Aggregated receipt-time telemetry for device{' '}
            <strong style={{ fontFamily: 'monospace', color: 'var(--dark-accent)' }}>{selectedDevice}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={sectionLabel}>Window:</span>
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      {/* Primary Trend Chart */}
      <div style={{ ...darkSurface, padding: 16 }}>
        <p style={{ ...sectionLabel, marginBottom: 12, color: 'var(--dark-accent)' }}>Active Load Distribution Over Time</p>
        <MeasurementChart
          title="Active Load Distribution Over Time"
          series={chartSeries}
          height={320}
          ariaDescription={`Active power trend across all configured channels for ${selectedDevice}`}
        />
      </div>

      {/* Billing & Units Provenance Disclosure (R12, R13 Non-negotiable requirement) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: 16,
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.20)',
          borderRadius: 10,
          fontSize: 12,
          color: 'var(--dark-text-primary)',
        }}
      >
        <AlertTriangle style={{ width: 16, height: 16, color: 'var(--dark-accent)', flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
        <div>
          <span style={{ fontWeight: 600, color: 'var(--dark-accent)', display: 'block', marginBottom: 4 }}>
            Contract Notice: Verified Billing Calculation Suppressed
          </span>
          <p style={{ color: 'var(--dark-text-muted)', lineHeight: 1.6, margin: 0 }}>
            Per MIN-SAKTHI specification, ESP32 raw legacy packets supply cumulative energy as uncalibrated tokens without verified hardware units (Wh vs. kWh). In accordance with engineering truth, monetary billing estimates and synthetic carbon counters remain disabled until counter reboot/wrap calibration is verified by company engineers.
          </p>
        </div>
      </div>

      {/* Channel Contribution Table */}
      <div style={{ ...darkSurface, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark-text-primary)', margin: 0 }}>
            Channel Load Contribution &amp; Dispersion
          </h3>
          <span style={{ fontSize: 12, color: 'var(--dark-text-muted)' }}>
            Min/max preserved across observed samples
          </span>
        </div>

        <div className="overflow-x-auto">
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--dark-border-strong)' }}>
                <th style={thStyle}>Slot</th>
                <th style={thStyle}>Load Description</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Current Load</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Min Power</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Max Power</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Share of Total</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Samples Recorded</th>
              </tr>
            </thead>
            <tbody>
              {channelStats.map((st) => (
                <tr key={st.channelId} style={{ borderBottom: '1px solid var(--dark-border)', color: 'var(--dark-text-primary)' }}>
                  <td style={{ padding: '12px', fontWeight: 700, color: 'var(--dark-accent)', fontFamily: 'monospace' }}>
                    CH0{st.displaySlot}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 500, color: 'var(--dark-text-primary)' }}>
                    {st.label}
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--dark-text-muted)', fontFamily: 'monospace' }}>
                      {st.channelId}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {st.currentPower !== null ? `${st.currentPower.toFixed(2)} W` : '—'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color: 'var(--dark-text-muted)' }}>
                    {st.minPower !== null ? `${st.minPower.toFixed(2)} W` : '—'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color: 'var(--dark-text-muted)' }}>
                    {st.maxPower !== null ? `${st.maxPower.toFixed(2)} W` : '—'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: 'rgba(200,169,110,0.12)',
                        color: 'var(--dark-accent)',
                        fontWeight: 600,
                      }}
                    >
                      {st.pct !== null ? `${st.pct}%` : '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color: 'var(--dark-text-muted)' }}>
                    {st.sampleCount} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
