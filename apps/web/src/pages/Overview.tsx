import React, { useMemo } from 'react';
import { Activity, Cpu } from 'lucide-react';
import type { useLiveTelemetry } from '../live/useLiveTelemetry';
import { FreshnessLabel, MeasurementChart } from '../components';

export interface OverviewProps {
  telemetry: ReturnType<typeof useLiveTelemetry>;
  selectedDevice: string;
}

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  color: 'var(--dark-text-muted)',
};

const metricValue: React.CSSProperties = {
  color: 'var(--dark-text-primary)',
  fontSize: '1.75rem',
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1.1,
};

const metricSubtext: React.CSSProperties = {
  color: 'var(--dark-text-muted)',
  fontSize: 11,
  marginTop: 4,
};

export const Overview: React.FC<OverviewProps> = ({
  telemetry,
  selectedDevice,
}) => {
  const {
    channels,
    health,
    coverage,
    powerHistory,
    lastDisplayLatencyMs,
    streamStatus,
  } = telemetry;

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

  const metrics = [
    {
      label: 'Active Power Total',
      value: activeCount > 0 ? totalPower.toFixed(1) : '—',
      unit: activeCount > 0 ? ' W' : '',
      subtext: coverage
        ? `${coverage.reportingSlots}/${coverage.configuredSlots} reporting${coverage.partial ? ' · Partial' : ' · Full'}`
        : 'Awaiting readings',
    },
    {
      label: 'Supply Voltage',
      value: voltageRange,
      unit: '',
      subtext: 'Configured channel range',
    },
    {
      label: 'Active Current',
      value: totalCurrent,
      unit: '',
      subtext: 'Sum across reporting loads',
    },
    {
      label: 'Grid Frequency',
      value: freqRange,
      unit: '',
      subtext: 'Monitored range',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Status Bar */}
      <div
        style={{
          background: 'var(--dark-surface)',
          border: '1px solid var(--dark-border)',
          borderRadius: 12,
          padding: '12px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--dark-text-primary)' }}>
            <Cpu style={{ width: 14, height: 14, color: 'var(--dark-accent)' }} aria-hidden="true" />
            <span>Device: <strong style={{ fontFamily: 'monospace', color: 'var(--dark-accent)' }}>{selectedDevice}</strong></span>
          </div>
          <span style={{ color: 'var(--dark-border-strong)' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                display: 'inline-block',
                background: streamStatus.tone === 'positive' ? 'var(--dark-status-ok)' : 'var(--dark-status-warn)',
              }}
            />
            <span style={{ color: 'var(--dark-text-muted)' }}>{`ESP: ${streamStatus.label}`}</span>
          </div>
          <span style={{ color: 'var(--dark-border-strong)' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--dark-text-muted)' }}>
            <span>Broker: <strong style={{ color: 'var(--dark-text-primary)', fontWeight: 500 }}>{health?.broker ?? 'unknown'}</strong></span>
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
              background: 'var(--dark-canvas, #050507)',
              borderRadius: 6,
              border: '1px solid var(--dark-border)',
              fontSize: 12,
              color: 'var(--dark-text-muted)',
              fontFamily: 'monospace',
            }}
          >
            <Activity style={{ width: 13, height: 13, color: 'var(--dark-accent)' }} aria-hidden="true" />
            <span>Display ACK: <strong style={{ color: 'var(--dark-text-primary)' }}>{`${lastDisplayLatencyMs}ms`}</strong></span>
          </div>
        )}
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            style={{
              background: 'var(--dark-surface)',
              border: '1px solid var(--dark-border)',
              borderRadius: 12,
              padding: '20px 24px',
              borderTop: '2px solid var(--dark-accent)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span style={sectionLabel}>{m.label}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={metricValue}>{m.value}</span>
              {m.unit && (
                <span style={{ color: 'var(--dark-text-muted)', fontSize: 13, fontWeight: 600 }}>{m.unit}</span>
              )}
            </div>
            <span style={metricSubtext}>{m.subtext}</span>
          </div>
        ))}
      </div>

      {/* Primary Chart: Real Active Power Trends */}
      <div
        style={{
          background: 'var(--dark-surface)',
          border: '1px solid var(--dark-border)',
          borderRadius: 12,
          padding: 16,
        }}
      >
        <MeasurementChart
          title="Active Power Trend (Receipt-Time with Gaps)"
          series={chartSeries}
          height={300}
          ariaDescription="Real-time and recent active power samples with breaks during communication gaps"
        />
      </div>

      {/* 5-Channel Mapped Slots Table */}
      <div
        style={{
          background: 'var(--dark-surface)',
          border: '1px solid var(--dark-border)',
          borderRadius: 12,
          padding: '20px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark-text-primary)', margin: 0 }}>
              Hardware Channel Mappings (CH01–CH05)
            </h3>
            <p style={{ fontSize: 12, color: 'var(--dark-text-muted)', marginTop: 2 }}>
              Mapped per device. Missing readings are null (—); valid zero load is 0.00.
            </p>
          </div>
          <span style={{ fontSize: 12, color: 'var(--dark-text-muted)', fontWeight: 500 }}>
            Slots reporting: {activeCount}/{configuredCount}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--dark-border-strong)', background: 'transparent' }}>
                {['Slot', 'Channel / Label', 'Voltage', 'Current', 'Power', 'Energy (Raw)', 'Freq', 'Status'].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 12px',
                      color: 'var(--dark-text-muted)',
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
                      borderBottom: '1px solid var(--dark-border)',
                      opacity: isUnconf ? 0.5 : 1,
                      color: 'var(--dark-text-primary)',
                    }}
                  >
                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--dark-accent)', fontFamily: 'monospace' }}>
                      {`CH0${ch.displaySlot ?? idx + 1}`}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 500, color: 'var(--dark-text-primary)' }}>
                      {ch.label}
                      <span style={{ display: 'block', fontSize: 11, color: 'var(--dark-text-muted)', fontFamily: 'monospace' }}>
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
                    <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', color: 'var(--dark-text-muted)' }}>
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
