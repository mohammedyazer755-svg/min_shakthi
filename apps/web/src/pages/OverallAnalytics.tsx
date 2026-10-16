import React, { useState, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { useLiveTelemetry } from '../live/useLiveTelemetry';
import { Card, TimeRangePicker, type TimeRange, MeasurementChart } from '../components';

export interface OverallAnalyticsProps {
  telemetry: ReturnType<typeof useLiveTelemetry>;
  selectedDevice: string;
}

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
      return sum + (ch.lastSample?.values.power ?? 0);
    }, 0);

    return channels
      .filter((ch) => ch.freshness !== 'unconfigured')
      .map((ch) => {
        const hist = powerHistory[ch.rawChannelId] || [];
        const sampleCount = hist.length;
        const currentPower = ch.lastSample?.values.power ?? 0;
        const pct = totalCurrentPower > 0 ? (currentPower / totalCurrentPower) * 100 : 0;

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
          pct: pct.toFixed(1),
          freshness: ch.freshness,
        };
      });
  }, [channels, powerHistory]);

  return (
    <div className="space-y-6">
      {/* Analytics Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface p-4 rounded-card border border-border">
        <div>
          <h2 className="text-base font-bold text-text-primary tracking-tight">
            Overall Energy & Load Analytics
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Aggregated receipt-time telemetry for device <strong className="font-mono text-brand-gold-text">{selectedDevice}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary font-medium">Window:</span>
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      {/* Primary Trend Chart */}
      <MeasurementChart
        title="Active Load Distribution Over Time"
        series={chartSeries}
        height={320}
        ariaDescription={`Active power trend across all configured channels for ${selectedDevice}`}
      />

      {/* Billing & Units Provenance Disclosure (R12, R13 Non-negotiable requirement) */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-control text-xs text-text-primary">
        <AlertTriangle className="w-4 h-4 text-brand-gold-text flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <span className="font-semibold text-brand-gold-text">
            Contract Notice: Verified Billing Calculation Suppressed
          </span>
          <p className="text-text-secondary leading-relaxed">
            Per MIN-SAKTHI specification, ESP32 raw legacy packets supply cumulative energy as uncalibrated tokens without verified hardware units (Wh vs. kWh). In accordance with engineering truth, monetary billing estimates and synthetic carbon counters remain disabled until counter reboot/wrap calibration is verified by company engineers.
          </p>
        </div>
      </div>

      {/* Channel Contribution Table */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary tracking-tight">
            Channel Load Contribution & Dispersion
          </h3>
          <span className="text-xs text-text-secondary">
            Min/max preserved across observed samples
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-canvas text-text-secondary font-semibold">
                <th className="py-2.5 px-3">Slot</th>
                <th className="py-2.5 px-3">Load Description</th>
                <th className="py-2.5 px-3 text-right">Current Load</th>
                <th className="py-2.5 px-3 text-right">Min Power</th>
                <th className="py-2.5 px-3 text-right">Max Power</th>
                <th className="py-2.5 px-3 text-right">Share of Total</th>
                <th className="py-2.5 px-3 text-right">Samples Recorded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {channelStats.map((st) => (
                <tr key={st.channelId} className="hover:bg-canvas/50 transition-colors">
                  <td className="py-3 px-3 font-semibold text-brand-gold-text">
                    CH0{st.displaySlot}
                  </td>
                  <td className="py-3 px-3 font-medium text-text-primary">
                    {st.label}
                    <span className="block text-[11px] text-text-secondary font-mono">
                      {st.channelId}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold">
                    {st.currentPower > 0 ? `${st.currentPower.toFixed(2)} W` : '0.00 W'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-text-secondary">
                    {st.minPower !== null ? `${st.minPower.toFixed(2)} W` : '—'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-text-secondary">
                    {st.maxPower !== null ? `${st.maxPower.toFixed(2)} W` : '—'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    <span className="inline-block px-2 py-0.5 rounded bg-canvas font-medium">
                      {st.pct}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-text-secondary">
                    {st.sampleCount} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
