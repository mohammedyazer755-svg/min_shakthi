import React, { useState, useMemo } from 'react';
import { Pause, Play, Activity, Copy, Check, Filter } from 'lucide-react';
import type { useLiveTelemetry } from '../live/useLiveTelemetry';
import { Card, Button } from '../components';

export interface RealTimeProps {
  telemetry: ReturnType<typeof useLiveTelemetry>;
  selectedDevice: string;
}

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

  return (
    <div className="space-y-6">
      {/* Realtime Stream Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface p-4 rounded-card border border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-status-positive animate-pulse" />
            <h2 className="text-base font-bold text-text-primary tracking-tight">
              Live Ingestion Telemetry Stream
            </h2>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Streaming packets from device <strong className="font-mono text-brand-gold-text">{selectedDevice}</strong> · Bounded to last 200 packets
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Channel Filter */}
          <div className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
            <Filter className="w-3.5 h-3.5" aria-hidden="true" />
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="py-1.5 px-2.5 bg-canvas border border-border rounded text-text-primary text-xs font-medium focus:ring-1 focus:ring-brand-gold focus:outline-none"
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
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-canvas rounded border border-border text-xs text-text-secondary font-mono">
              <Activity className="w-3.5 h-3.5 text-brand-gold-text" aria-hidden="true" />
              <span>ACK: <strong>{`${lastDisplayLatencyMs}ms`}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Paused Banner Notice */}
      {isViewPaused && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-control flex items-center justify-between text-xs text-brand-gold-text">
          <span>
            Stream display paused for inspection. Live ingestion and persister continue in background.
          </span>
          <button
            type="button"
            onClick={resumeView}
            className="font-bold underline hover:no-underline ml-3"
          >
            Catch up now ({pausedCatchupCount} new)
          </button>
        </div>
      )}

      {/* Live Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-canvas text-text-secondary font-semibold">
                <th className="py-2.5 px-3">Receipt Time (UTC)</th>
                <th className="py-2.5 px-3">Event ID</th>
                <th className="py-2.5 px-3">Seq</th>
                <th className="py-2.5 px-3">Channel</th>
                <th className="py-2.5 px-3 text-right">Voltage</th>
                <th className="py-2.5 px-3 text-right">Current</th>
                <th className="py-2.5 px-3 text-right">Power</th>
                <th className="py-2.5 px-3 text-right">Energy (Raw)</th>
                <th className="py-2.5 px-3 text-right">Freq</th>
                <th className="py-2.5 px-3 text-center">Envelope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPackets.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-text-secondary">
                    <span>Awaiting live incoming telemetry packets from broker...</span>
                  </td>
                </tr>
              ) : (
                filteredPackets.map((pkt) => {
                  const isCopied = copiedEventId === pkt.eventId;
                  return (
                    <tr key={pkt.eventId} className="hover:bg-canvas/50 transition-colors font-mono">
                      <td className="py-2.5 px-3 text-text-primary">
                        {new Date(pkt.receivedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          fractionalSecondDigits: 3,
                        })}
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleCopyEventId(pkt.eventId)}
                          className="inline-flex items-center gap-1 text-[11px] text-text-secondary hover:text-brand-gold-text focus:outline-none"
                          title="Click to copy full Event ID"
                        >
                          <span>{`${pkt.eventId.slice(0, 8)}...`}</span>
                          {isCopied ? (
                            <Check className="w-3 h-3 text-status-positive" aria-hidden="true" />
                          ) : (
                            <Copy className="w-3 h-3" aria-hidden="true" />
                          )}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-text-secondary">
                        {`#${pkt.sequence}`}
                      </td>
                      <td className="py-2.5 px-3 font-sans font-medium text-text-primary">
                        {pkt.channelId}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {`${pkt.values.voltage.toFixed(2)} V`}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {`${pkt.values.current.toFixed(2)} A`}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-text-primary">
                        {`${pkt.values.power.toFixed(2)} W`}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-text-secondary">
                        {pkt.values.energyRaw}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {`${pkt.values.frequency.toFixed(2)} Hz`}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {pkt.retained ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-sans font-semibold">
                            Retained
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 font-sans font-semibold">
                            Live
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
      </Card>
    </div>
  );
};
