import React, { useState, useMemo } from 'react';
import { Pause, Play, Activity, Copy, Check, Filter } from 'lucide-react';
import type { useLiveTelemetry } from '../live/useLiveTelemetry';
import { Button } from '../components';

export interface RealTimeProps {
  telemetry: ReturnType<typeof useLiveTelemetry>;
  selectedDevice: string;
}

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  color: 'var(--dark-text-muted)',
};

const darkSurface: React.CSSProperties = {
  background: 'var(--dark-surface)',
  border: '1px solid var(--dark-border)',
  borderRadius: 12,
};

const darkInput: React.CSSProperties = {
  padding: '6px 10px',
  background: 'var(--dark-canvas, #050507)',
  border: '1px solid var(--dark-border)',
  borderRadius: 6,
  color: 'var(--dark-text-primary)',
  fontSize: 12,
  fontWeight: 500,
  outline: 'none',
};

export const RealTime: React.FC<RealTimeProps> = ({
  telemetry,
  selectedDevice,
}) => {
  const {
    livePackets,
    isViewPaused,
    pausedCatchupCount,
    pauseView,
    resumeView,
    lastDisplayLatencyMs,
    channels,
  } = telemetry;

  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  const filteredPackets = useMemo(() => {
    if (channelFilter === 'all') return livePackets;
    return livePackets.filter((p) => p.channelId === channelFilter);
  }, [livePackets, channelFilter]);

  const handleCopyEventId = (eventId: string) => {
    navigator.clipboard.writeText(eventId).catch(() => {});
    setCopiedEventId(eventId);
    setTimeout(() => setCopiedEventId(null), 2000);
  };

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    color: 'var(--dark-text-muted)',
    fontWeight: 700,
    textTransform: 'uppercase',
    fontSize: 10,
    letterSpacing: '0.1em',
  };

  return (
    <div className="space-y-6">
      {/* Realtime Stream Header & Controls */}
      <div style={{ ...darkSurface, padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Recent telemetry packets
            </h2>
          </div>
          <p style={{ fontSize: 12, color: 'var(--dark-text-muted)', marginTop: 2 }}>
            Streaming packets from device{' '}
            <strong style={{ fontFamily: 'monospace', color: 'var(--dark-accent)' }}>{selectedDevice}</strong>
            {' '}· Bounded to last 200 packets
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          {/* Channel Filter */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...sectionLabel }}>
            <Filter style={{ width: 13, height: 13 }} aria-hidden="true" />
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              style={darkInput}
            >
              <option value="all">All Channels</option>
              {channels
                .filter((c) => c.freshness !== 'unconfigured')
                .map((c) => (
                  <option key={c.rawChannelId} value={c.rawChannelId}>
                    {c.label} ({c.rawChannelId})
                  </option>
                ))}
            </select>
          </div>

          {/* Pause / Resume Control */}
          {isViewPaused ? (
            <Button
              size="sm"
              variant="primary"
              onClick={resumeView}
              className="inline-flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Resume Stream {pausedCatchupCount > 0 ? `(${pausedCatchupCount} pending)` : ''}</span>
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={pauseView}
              className="inline-flex items-center gap-1.5"
            >
              <Pause className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Pause View</span>
            </Button>
          )}

          {/* Latency Probe */}
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
              <span>ACK: <strong style={{ color: 'var(--dark-text-primary)' }}>{`${lastDisplayLatencyMs}ms`}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Paused Banner Notice */}
      {isViewPaused && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: 'var(--dark-accent)',
          }}
        >
          <span>
            Stream display paused for inspection. Live ingestion and persister continue in background.
          </span>
          <button
            type="button"
            onClick={resumeView}
            style={{ fontWeight: 700, textDecoration: 'underline', color: 'var(--dark-accent)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 12 }}
          >
            Catch up now ({pausedCatchupCount} new)
          </button>
        </div>
      )}

      {/* Live Table */}
      <div style={{ ...darkSurface, overflow: 'hidden' }}>
        <div className="overflow-x-auto">
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--dark-border-strong)', background: 'transparent' }}>
                <th style={thStyle}>Receipt Time (UTC)</th>
                <th style={thStyle}>Event ID</th>
                <th style={thStyle}>Seq</th>
                <th style={{ ...thStyle, color: 'var(--dark-accent)' }}>Channel</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Voltage</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Current</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Power</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Energy (Raw)</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Freq</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Envelope</th>
              </tr>
            </thead>
            <tbody>
              {filteredPackets.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '48px 12px', textAlign: 'center', color: 'var(--dark-text-muted)' }}>
                    <span>Awaiting live incoming telemetry packets from broker...</span>
                  </td>
                </tr>
              ) : (
                filteredPackets.map((pkt) => {
                  const isCopied = copiedEventId === pkt.eventId;
                  return (
                    <tr
                      key={pkt.eventId}
                      style={{
                        borderBottom: '1px solid var(--dark-border)',
                        fontFamily: 'monospace',
                        color: 'var(--dark-text-primary)',
                        transition: 'background 0.15s',
                      }}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        {new Date(pkt.receivedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          fractionalSecondDigits: 3,
                        })}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <button
                          type="button"
                          onClick={() => handleCopyEventId(pkt.eventId)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            color: 'var(--dark-text-muted)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                          title="Click to copy full Event ID"
                        >
                          <span>{`${pkt.eventId.slice(0, 8)}...`}</span>
                          {isCopied ? (
                            <Check style={{ width: 11, height: 11, color: '#22c55e' }} aria-hidden="true" />
                          ) : (
                            <Copy style={{ width: 11, height: 11 }} aria-hidden="true" />
                          )}
                        </button>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--dark-text-muted)' }}>
                        {`#${pkt.sequence}`}
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'sans-serif', fontWeight: 500, color: 'var(--dark-accent)' }}>
                        {pkt.channelId}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {`${pkt.values.voltage.toFixed(2)} V`}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {`${pkt.values.current.toFixed(2)} A`}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--dark-text-primary)' }}>
                        {`${pkt.values.power.toFixed(2)} W`}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--dark-text-muted)' }}>
                        {pkt.values.energyRaw}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {`${pkt.values.frequency.toFixed(2)} Hz`}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {pkt.retained ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontFamily: 'sans-serif',
                              fontWeight: 700,
                              background: 'rgba(245,158,11,0.12)',
                              color: '#f59e0b',
                              border: '1px solid rgba(245,158,11,0.25)',
                            }}
                          >
                            Retained
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontFamily: 'sans-serif',
                              fontWeight: 700,
                              background: 'rgba(34,197,94,0.10)',
                              color: '#22c55e',
                              border: '1px solid rgba(34,197,94,0.20)',
                            }}
                          >
                            Received
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
