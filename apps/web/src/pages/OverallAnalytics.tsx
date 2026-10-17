import React, { useState, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { useLiveTelemetry } from '../live/useLiveTelemetry';
import { TimeRangePicker, type TimeRange, MeasurementChart } from '../components';

export interface OverallAnalyticsProps {
  telemetry: ReturnType<typeof useLiveTelemetry>;
  selectedDevice: string;
}

const lightSurface: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  boxShadow: 'var(--shadow-card)',
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  color: 'var(--text-secondary)',
};

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  color: 'var(--text-secondary)',
  fontWeight: 700,
  textTransform: 'uppercase',
  fontSize: 10,
  letterSpacing: '0.1em',
};

export const OverallAnalytics: React.FC<OverallAnalyticsProps> = ({
  telemetry,
  selectedDevice: _selectedDevice,
}) => {
  const { channels, powerHistory } = telemetry;
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');

  // Channel chart series
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
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Overall Energy &amp; Load Analytics
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            Active power history, load dispersion, and verified billing compliance notes.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={sectionLabel}>Window:</span>
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      {/* Contract Notice Banner (R12, R13) */}
      <div
        style={{
          padding: '14px 18px',
          background: 'rgba(128, 83, 0, 0.06)',
          border: '1px solid rgba(128, 83, 0, 0.25)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
        role="note"
      >
        <AlertTriangle style={{ width: 18, height: 18, color: 'var(--status-warn)', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
        <div style={{ fontSize: 12, lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--status-warn)', display: 'block', marginBottom: 2 }}>
            Contract Notice: Verified Billing Calculation Suppressed
          </strong>
          <span style={{ color: 'var(--text-secondary)' }}>
            ESP32 raw legacy packets supply cumulative energy as uncalibrated tokens (energyRaw). Metrology units and hardware
            calibration remain unverified against revenue-grade reference meters. Energy tariff multipliers are withheld to maintain data integrity.
          </span>
        </div>
      </div>

      {/* Multi-Channel Trend Chart */}
      <div style={{ ...lightSurface, padding: 16 }}>
        <p style={{ ...sectionLabel, marginBottom: 8, color: 'var(--accent-text)' }}>
          Multi-Channel Active Power Trend ({timeRange})
        </p>
        <MeasurementChart
          title={`Active Power Trend (${timeRange})`}
          series={chartSeries}
          height={320}
          ariaDescription={`Multi-channel power trends over a ${timeRange} window with visible gaps`}
        />
      </div>

      {/* Channel Dispersion Table */}
      <div style={{ ...lightSurface, padding: '20px 24px' }}>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Channel Load Contribution &amp; Dispersion
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            Current load sharing across active monitored channels.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-strong)', background: 'transparent' }}>
                <th style={thStyle}>Slot</th>
                <th style={thStyle}>Load Label</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Active Power</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Min Power</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Max Power</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Load Share</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Samples In Memory</th>
              </tr>
            </thead>
            <tbody>
              {channelStats.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No reporting channels configured.
                  </td>
                </tr>
              ) : (
                channelStats.map((ch, idx) => (
                  <tr
                    key={ch.channelId}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      fontFamily: 'monospace',
                    }}
                  >
                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--accent-text)' }}>
                      {`CH0${ch.displaySlot ?? idx + 1}`}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 500, fontFamily: 'inherit', color: 'var(--text-primary)' }}>
                      {ch.label}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {ch.currentPower !== null ? `${ch.currentPower.toFixed(2)} W` : '—'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>
                      {ch.minPower !== null ? `${ch.minPower.toFixed(2)} W` : '—'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>
                      {ch.maxPower !== null ? `${ch.maxPower.toFixed(2)} W` : '—'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--accent-text)', fontWeight: 600 }}>
                      {ch.pct !== null ? `${ch.pct}%` : '—'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>
                      {ch.sampleCount}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OverallAnalytics;
