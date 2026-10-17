import React, { useState, useMemo } from 'react';
import { ShieldAlert } from 'lucide-react';
import type { useLiveTelemetry } from '../live/useLiveTelemetry';
import { FreshnessLabel, MeasurementChart, MetricCard } from '../components';

export interface ChannelAnalyticsProps {
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
        color: '#171717',
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
          ...lightSurface,
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
              border: '1px solid var(--border)',
              background: 'var(--surface-raised)',
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
                    border: isSelected ? '1px solid var(--border-strong)' : '1px solid transparent',
                    background: isSelected ? 'var(--surface)' : 'transparent',
                    color: isSelected ? 'var(--accent-text)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    opacity: unconf ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: isSelected ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
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
                            ? 'var(--status-ok)'
                            : ch.freshness === 'stale'
                              ? 'var(--status-warn)'
                              : 'var(--status-unknown)',
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
            <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
              Raw ID: <strong style={{ color: 'var(--text-primary)' }}>{selectedChannel.rawChannelId}</strong>
            </span>
          </div>
        )}
      </div>

      {isUnconfigured ? (
        <div
          style={{
            ...lightSurface,
            padding: '64px 32px',
            textAlign: 'center',
          }}
        >
          <ShieldAlert style={{ width: 32, height: 32, color: 'var(--text-secondary)', margin: '0 auto 12px', opacity: 0.6 }} aria-hidden="true" />
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
            Slot CH0{selectedSlot} is Unconfigured
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
            Device{' '}
            <strong style={{ fontFamily: 'monospace', color: 'var(--accent-text)' }}>{selectedDevice}</strong>{' '}
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
          <div style={{ ...lightSurface, padding: 16 }}>
            <p style={{ ...sectionLabel, marginBottom: 8, color: 'var(--accent-text)' }}>
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
          <div style={{ ...lightSurface, padding: '20px 24px' }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
              Channel Metadata &amp; Ingestion Provenance
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  label: 'Assigned Load Label',
                  value: <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{selectedChannel?.label}</span>,
                },
                {
                  label: 'Cumulative Raw Energy Counter',
                  value: (
                    <>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                        {lastSample?.values.energyRaw ?? '—'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginTop: 2 }}>Unit unverified (tokens)</span>
                    </>
                  ),
                },
                {
                  label: 'Last Packet Receipt',
                  value: (
                    <>
                      <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: 13 }}>
                        {selectedChannel?.lastReceivedAt
                          ? new Date(selectedChannel.lastReceivedAt).toLocaleTimeString()
                          : 'Awaiting first packet'}
                      </span>
                      {selectedChannel?.lastReceivedAt && (
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginTop: 2 }}>
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
                    background: 'var(--canvas)',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
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

export default ChannelAnalytics;
