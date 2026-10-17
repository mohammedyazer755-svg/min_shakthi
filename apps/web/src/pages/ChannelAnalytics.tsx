import React, { useState, useMemo } from 'react';
import { ShieldAlert } from 'lucide-react';
import type { useLiveTelemetry } from '../live/useLiveTelemetry';
import { FreshnessLabel, MeasurementChart, MetricCard } from '../components';

export interface ChannelAnalyticsProps {
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

  const lastSample = selectedChannel?.freshness === 'fresh' ? selectedChannel.lastSample : null;
  const isUnconfigured = selectedChannel?.freshness === 'unconfigured';

  return (
    <div className="space-y-6">
      {/* Slot Selector Tabs */}
      <div
        style={{
          ...darkSurface,
          padding: '12px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={sectionLabel}>Channel:</span>
          <div
            style={{
              display: 'inline-flex',
              borderRadius: 8,
              border: '1px solid var(--dark-border)',
              background: 'var(--dark-canvas, #050507)',
              padding: 2,
              gap: 2,
            }}
          >
            {[1, 2, 3, 4, 5].map((slot) => {
              const ch = channels.find((c) => c.displaySlot === slot);
              const isSelected = selectedSlot === slot;
              const unconf = ch?.freshness === 'unconfigured';
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    borderRadius: 6,
                    border: isSelected ? '1px solid rgba(200,169,110,0.35)' : '1px solid transparent',
                    background: isSelected ? 'var(--dark-surface)' : 'transparent',
                    color: isSelected ? 'var(--dark-accent)' : 'var(--dark-text-muted)',
                    cursor: 'pointer',
                    opacity: unconf ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    transition: 'all 0.15s',
                  }}
                >
                  <span>{`CH0${slot}`}</span>
                  {ch && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background:
                          ch.freshness === 'fresh'
                            ? '#22c55e'
                            : ch.freshness === 'stale'
                            ? '#f59e0b'
                            : 'rgba(138,138,150,0.4)',
                        display: 'inline-block',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {selectedChannel && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <FreshnessLabel freshness={selectedChannel.freshness} />
            <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--dark-text-muted)' }}>
              Raw ID: <strong style={{ color: 'var(--dark-text-primary)' }}>{selectedChannel.rawChannelId}</strong>
            </span>
          </div>
        )}
      </div>

      {isUnconfigured ? (
        <div
          style={{
            ...darkSurface,
            padding: '64px 32px',
            textAlign: 'center',
          }}
        >
          <ShieldAlert style={{ width: 32, height: 32, color: 'var(--dark-text-muted)', margin: '0 auto 12px', opacity: 0.6 }} aria-hidden="true" />
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--dark-text-primary)', margin: '0 0 6px' }}>
            Slot CH0{selectedSlot} is Unconfigured
          </h3>
          <p style={{ fontSize: 12, color: 'var(--dark-text-muted)', maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
            Device{' '}
            <strong style={{ fontFamily: 'monospace', color: 'var(--dark-accent)' }}>{selectedDevice}</strong>{' '}
            has no hardware channel assigned to display slot {selectedSlot}. In accordance with telemetry truth, unconfigured slots report null readings without simulated data.
          </p>
        </div>
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
          <div style={{ ...darkSurface, padding: 16 }}>
            <p style={{ ...sectionLabel, marginBottom: 8, color: 'var(--dark-accent)' }}>
              CH0{selectedChannel?.displaySlot} Active Power Trend
            </p>
            <MeasurementChart
              title={`CH0${selectedChannel?.displaySlot} Active Power Trend`}
              series={channelChartSeries}
              height={300}
              ariaDescription={`Active power trend for ${selectedChannel?.label}`}
            />
          </div>

          {/* Channel Detail Specs */}
          <div style={{ ...darkSurface, padding: '20px 24px' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark-text-primary)', marginBottom: 12 }}>
              Channel Metadata &amp; Ingestion Provenance
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  label: 'Assigned Load Label',
                  value: <span style={{ fontWeight: 600, color: 'var(--dark-text-primary)', fontSize: 13 }}>{selectedChannel?.label}</span>,
                },
                {
                  label: 'Cumulative Raw Energy Counter',
                  value: (
                    <>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--dark-text-primary)', fontSize: 13 }}>
                        {lastSample?.values.energyRaw ?? '—'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--dark-text-muted)', display: 'block', marginTop: 2 }}>Unit unverified (tokens)</span>
                    </>
                  ),
                },
                {
                  label: 'Last Packet Receipt',
                  value: (
                    <>
                      <span style={{ fontFamily: 'monospace', color: 'var(--dark-text-primary)', fontSize: 13 }}>
                        {selectedChannel?.lastReceivedAt
                          ? new Date(selectedChannel.lastReceivedAt).toLocaleTimeString()
                          : 'Awaiting first packet'}
                      </span>
                      {selectedChannel?.lastReceivedAt && (
                        <span style={{ fontSize: 11, color: 'var(--dark-text-muted)', display: 'block', marginTop: 2 }}>
                          {new Date(selectedChannel.lastReceivedAt).toLocaleDateString()}
                        </span>
                      )}
                    </>
                  ),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: 12,
                    background: 'var(--dark-canvas, #050507)',
                    borderRadius: 8,
                    border: '1px solid var(--dark-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: 'var(--dark-text-muted)' }}>{item.label}</span>
                  {item.value}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
