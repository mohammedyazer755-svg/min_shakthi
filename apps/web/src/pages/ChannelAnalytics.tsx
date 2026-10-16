import React, { useState, useMemo } from 'react';
import { ShieldAlert } from 'lucide-react';
import type { useLiveTelemetry } from '../live/useLiveTelemetry';
import { Card, MetricCard, FreshnessLabel, MeasurementChart } from '../components';

export interface ChannelAnalyticsProps {
  telemetry: ReturnType<typeof useLiveTelemetry>;
  selectedDevice: string;
}

export const ChannelAnalytics: React.FC<ChannelAnalyticsProps> = ({
  telemetry,
  selectedDevice,
}) => {
  const { channels, powerHistory } = telemetry;
  const [selectedSlot, setSelectedSlot] = useState<number>(1);

  // Active channel selected by slot
  const selectedChannel = useMemo(() => {
    return channels.find((c) => c.displaySlot === selectedSlot) ?? channels[0];
  }, [channels, selectedSlot]);

  // Chart data for selected channel
  const channelChartSeries = useMemo(() => {
    if (!selectedChannel) return [];
    const hist = powerHistory[selectedChannel.rawChannelId] || [];
    return [
      {
        id: selectedChannel.rawChannelId,
        name: `${selectedChannel.label} (CH0${selectedChannel.displaySlot})`,
        color: '#80601E',
        unit: 'W',
        data: hist,
      },
    ];
  }, [selectedChannel, powerHistory]);

  const lastSample = selectedChannel?.lastSample;
  const isUnconfigured = selectedChannel?.freshness === 'unconfigured';

  return (
    <div className="space-y-6">
      {/* Slot Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface p-3 md:p-4 rounded-card border border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Channel:
          </span>
          <div className="inline-flex rounded-control border border-border bg-canvas p-0.5">
            {[1, 2, 3, 4, 5].map((slot) => {
              const ch = channels.find((c) => c.displaySlot === slot);
              const isSelected = selectedSlot === slot;
              const unconf = ch?.freshness === 'unconfigured';
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-[6px] transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-surface text-brand-gold-text shadow-xs border border-brand-gold/30'
                      : 'text-text-secondary hover:text-text-primary'
                  } ${unconf ? 'opacity-60' : ''}`}
                >
                  <span>{`CH0${slot}`}</span>
                  {ch && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        ch.freshness === 'fresh'
                          ? 'bg-status-positive'
                          : ch.freshness === 'stale'
                          ? 'bg-status-warning'
                          : 'bg-text-secondary/40'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {selectedChannel && (
          <div className="flex items-center gap-3">
            <FreshnessLabel freshness={selectedChannel.freshness} />
            <span className="text-xs font-mono text-text-secondary">
              Raw ID: <strong>{selectedChannel.rawChannelId}</strong>
            </span>
          </div>
        )}
      </div>

      {isUnconfigured ? (
        <Card className="text-center py-16 px-4">
          <ShieldAlert className="w-8 h-8 text-text-secondary mx-auto mb-3 opacity-60" aria-hidden="true" />
          <h3 className="text-base font-semibold text-text-primary">
            Slot CH0{selectedSlot} is Unconfigured
          </h3>
          <p className="text-xs text-text-secondary max-w-md mx-auto mt-1 leading-relaxed">
            Device <strong className="font-mono text-brand-gold-text">{selectedDevice}</strong> has no hardware channel assigned to display slot {selectedSlot}. In accordance with telemetry truth, unconfigured slots report null readings without simulated data.
          </p>
        </Card>
      ) : (
        <>
          {/* Channel KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Active Power"
              value={lastSample?.values.power != null ? lastSample.values.power.toFixed(2) : '—'}
              unit={lastSample?.values.power != null ? 'W' : ''}
              subtext="Current electrical power load"
            />

            <MetricCard
              label="Phase Voltage"
              value={lastSample?.values.voltage != null ? lastSample.values.voltage.toFixed(2) : '—'}
              unit={lastSample?.values.voltage != null ? 'V' : ''}
              subtext="Monitored incoming voltage"
            />

            <MetricCard
              label="Phase Current"
              value={lastSample?.values.current != null ? lastSample.values.current.toFixed(2) : '—'}
              unit={lastSample?.values.current != null ? 'A' : ''}
              subtext={lastSample?.values.current === 0 ? 'Confirmed zero current load' : 'Monitored branch load'}
            />

            <MetricCard
              label="Grid Frequency"
              value={lastSample?.values.frequency != null ? lastSample.values.frequency.toFixed(2) : '—'}
              unit={lastSample?.values.frequency != null ? 'Hz' : ''}
              subtext="Line frequency"
            />
          </div>

          {/* Primary Channel Trend Chart */}
          <MeasurementChart
            title={`CH0${selectedChannel?.displaySlot} Active Power Trend`}
            series={channelChartSeries}
            height={300}
            ariaDescription={`Active power trend for ${selectedChannel?.label}`}
          />

          {/* Channel Detail Specs */}
          <Card className="p-4 md:p-6">
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Channel Metadata & Ingestion Provenance
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-canvas rounded border border-border space-y-1">
                <span className="text-text-secondary">Assigned Load Label</span>
                <div className="font-semibold text-text-primary text-sm">{selectedChannel?.label}</div>
              </div>

              <div className="p-3 bg-canvas rounded border border-border space-y-1">
                <span className="text-text-secondary">Cumulative Raw Energy Counter</span>
                <div className="font-mono font-semibold text-text-primary text-sm">
                  {lastSample?.values.energyRaw ?? '—'}
                </div>
                <span className="text-[11px] text-text-secondary block">Unit unverified (tokens)</span>
              </div>

              <div className="p-3 bg-canvas rounded border border-border space-y-1">
                <span className="text-text-secondary">Last Packet Receipt</span>
                <div className="font-mono text-text-primary text-sm">
                  {selectedChannel?.lastReceivedAt
                    ? new Date(selectedChannel.lastReceivedAt).toLocaleTimeString()
                    : 'Awaiting first packet'}
                </div>
                {selectedChannel?.lastReceivedAt && (
                  <span className="text-[11px] text-text-secondary block">
                    {new Date(selectedChannel.lastReceivedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
