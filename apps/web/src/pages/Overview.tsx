import React, { useMemo } from 'react';
import { Activity, Cpu } from 'lucide-react';
import type { useLiveTelemetry } from '../live/useLiveTelemetry';
import { Card, MetricCard, FreshnessLabel, MeasurementChart } from '../components';

export interface OverviewProps {
  telemetry: ReturnType<typeof useLiveTelemetry>;
  selectedDevice: string;
}

export const Overview: React.FC<OverviewProps> = ({
  telemetry,
  selectedDevice,
}) => {
  const {
    channels,
    health,
    coverage,
    connectionState,
    powerHistory,
    lastDisplayLatencyMs,
  } = telemetry;

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

  // Voltage and Frequency ranges across reporting channels
  const { voltageRange, freqRange, totalCurrent } = useMemo(() => {
    let minV = Number.POSITIVE_INFINITY;
    let maxV = Number.NEGATIVE_INFINITY;
    let minF = Number.POSITIVE_INFINITY;
    let maxF = Number.NEGATIVE_INFINITY;
    let sumI = 0;
    let count = 0;

    for (const ch of channels) {
      if (ch.lastSample && ch.freshness !== 'unconfigured') {
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

  return (
    <div className="space-y-6">
      {/* Top Status & Metrics Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 md:p-4 rounded-card border border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
            <Cpu className="w-4 h-4 text-brand-gold-text" aria-hidden="true" />
            <span>Device: <strong className="font-mono text-brand-gold-text">{selectedDevice}</strong></span>
          </div>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionState === 'connected' ? 'bg-status-positive' : 'bg-status-critical'
              }`}
            />
            <span className="text-text-secondary capitalize">{`Socket ${connectionState}`}</span>
          </div>
          <span className="text-border hidden sm:inline">|</span>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-text-secondary">
            <span>Broker: <strong className="text-text-primary font-medium">{health?.broker ?? 'unknown'}</strong></span>
          </div>
        </div>

        {/* Display ACK latency */}
        {lastDisplayLatencyMs !== null && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-canvas rounded border border-border text-xs text-text-secondary font-mono">
            <Activity className="w-3.5 h-3.5 text-brand-gold-text" aria-hidden="true" />
            <span>Display ACK: <strong>{`${lastDisplayLatencyMs}ms`}</strong></span>
          </div>
        )}
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Active Power Total"
          value={activeCount > 0 ? totalPower.toFixed(1) : '—'}
          unit={activeCount > 0 ? 'W' : ''}
          subtext={
            coverage
              ? `${coverage.reportingSlots}/${coverage.configuredSlots} reporting${
                  coverage.partial ? ' · Partial' : ' · Full'
                }`
              : 'Awaiting readings'
          }
        />

        <MetricCard
          label="Supply Voltage"
          value={voltageRange}
          subtext="Configured channel range"
        />

        <MetricCard
          label="Active Current"
          value={totalCurrent}
          subtext="Sum across reporting loads"
        />

        <MetricCard
          label="Grid Frequency"
          value={freqRange}
          subtext="Monitored range"
        />
      </div>

      {/* Primary Chart: Real Active Power Trends */}
      <MeasurementChart
        title="Active Power Trend (Receipt-Time with Gaps)"
        series={chartSeries}
        height={300}
        ariaDescription="Real-time and recent active power samples with breaks during communication gaps"
      />

      {/* 5-Channel Mapped Slots Table */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-text-primary tracking-tight">
              Hardware Channel Mappings (CH01–CH05)
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Mapped per device. Missing readings are null (—); valid zero load is 0.00.
            </p>
          </div>
          <span className="text-xs text-text-secondary font-medium">
            Slots reporting: {activeCount}/{configuredCount}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-canvas text-text-secondary font-semibold">
                <th className="py-2.5 px-3">Slot</th>
                <th className="py-2.5 px-3">Channel / Label</th>
                <th className="py-2.5 px-3 text-right">Voltage</th>
                <th className="py-2.5 px-3 text-right">Current</th>
                <th className="py-2.5 px-3 text-right">Power</th>
                <th className="py-2.5 px-3 text-right">Energy (Raw)</th>
                <th className="py-2.5 px-3 text-right">Freq</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {channels.map((ch, idx) => {
                const s = ch.lastSample;
                const isUnconf = ch.freshness === 'unconfigured';
                return (
                  <tr
                    key={ch.displaySlot ?? idx}
                    className={`hover:bg-canvas/50 transition-colors ${
                      isUnconf ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-semibold text-brand-gold-text">
                      {`CH0${ch.displaySlot ?? idx + 1}`}
                    </td>
                    <td className="py-3 px-3 font-medium text-text-primary">
                      {ch.label}
                      <span className="block text-[11px] text-text-secondary font-mono">
                        {ch.rawChannelId}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {s?.values.voltage != null ? `${s.values.voltage.toFixed(2)} V` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {s?.values.current != null ? `${s.values.current.toFixed(2)} A` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold">
                      {s?.values.power != null ? `${s.values.power.toFixed(2)} W` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-text-secondary">
                      {s?.values.energyRaw != null ? s.values.energyRaw : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {s?.values.frequency != null ? `${s.values.frequency.toFixed(2)} Hz` : '—'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <FreshnessLabel freshness={ch.freshness} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
