import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '../components';
import { useAuth } from '../auth/AuthContext';
import type { UseLiveTelemetryResult } from '../live/useLiveTelemetry';
import {
  Download,
  Filter,
  RefreshCw,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import type { TelemetryPayload, SnapshotChannel } from '@minsakthi/contracts';

export interface HistoryProps {
  telemetry: UseLiveTelemetryResult;
  selectedDevice: string;
}

export const History: React.FC<HistoryProps> = ({ telemetry, selectedDevice }) => {
  const { accessToken, user } = useAuth();
  const { channels } = telemetry;

  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState<number>(1);
  const [samples, setSamples] = useState<TelemetryPayload[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [cutoff, setCutoff] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!accessToken || !user) return;
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      let fromDate: Date;
      if (timeRange === '1h') {
        fromDate = new Date(now.getTime() - 60 * 60 * 1000);
      } else if (timeRange === '24h') {
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      } else {
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const offset = (page - 1) * pageSize;
      const params = new URLSearchParams({
        channelId: selectedChannel,
        from: fromDate.toISOString(),
        limit: String(pageSize),
        offset: String(offset),
      });
      if (cutoff) {
        params.set('cutoff', cutoff);
      }

      const res = await fetch(
        `/api/v1/sites/${user.siteId}/devices/${selectedDevice}/history?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (res.status === 503) {
        setError('Historical database is temporarily degraded. Please retry in 5 seconds.');
        setSamples([]);
        setTotal(0);
        return;
      }

      if (!res.ok) {
        throw new Error(`History query failed: ${res.statusText}`);
      }

      const data = await res.json();
      setSamples(data.samples || []);
      setTotal(data.total || 0);
      if (data.cutoff && !cutoff) {
        setCutoff(data.cutoff);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to fetch historical telemetry.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, user, selectedDevice, selectedChannel, timeRange, pageSize, page, cutoff]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleExportCsv = async () => {
    if (!accessToken || !user) return;
    try {
      const params = new URLSearchParams({
        channelId: selectedChannel,
      });
      if (cutoff) params.set('cutoff', cutoff);

      const res = await fetch(
        `/api/v1/sites/${user.siteId}/devices/${selectedDevice}/export?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!res.ok) {
        alert('Failed to export CSV: server error.');
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedDevice}-${selectedChannel}-telemetry.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export error: ${(err as Error).message}`);
    }
  };

  const handleCopyEventId = (id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(id);
      setCopiedEventId(id);
      setTimeout(() => setCopiedEventId(null), 2000);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      {/* Header & Controls Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface p-4 rounded-card border border-border">
        <div>
          <h2 className="text-base font-bold text-text-primary tracking-tight">
            Historical Telemetry Logs &amp; Audit
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Query immutable historical readings with deterministic cutoff and formula-escaped CSV exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {cutoff && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-canvas rounded border border-border text-xs text-text-secondary font-mono">
              <Clock className="w-3.5 h-3.5 text-brand-gold-text" aria-hidden="true" />
              <span>{`Cutoff: ${new Date(cutoff).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}</span>
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setCutoff('');
              fetchHistory();
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Reset Query</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-3 bg-surface border border-border flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Filter className="w-3.5 h-3.5 text-brand-gold-text" aria-hidden="true" />
            <span className="font-medium text-text-primary">Channel:</span>
            <select
              value={selectedChannel}
              onChange={(e) => {
                setSelectedChannel(e.target.value);
                setPage(1);
              }}
              className="py-1 px-2.5 bg-canvas border border-border rounded text-text-primary focus:outline-none"
            >
              <option value="all">All Channels</option>
              {channels
                .filter((c: SnapshotChannel) => c.freshness !== 'unconfigured')
                .map((c: SnapshotChannel) => (
                  <option key={c.rawChannelId} value={c.rawChannelId}>
                    {`${c.label} (${c.rawChannelId})`}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-text-secondary">
            <span className="font-medium text-text-primary">Window:</span>
            <div className="inline-flex rounded border border-border p-0.5 bg-canvas">
              {(['1h', '24h', '7d'] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    setTimeRange(w);
                    setPage(1);
                  }}
                  className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                    timeRange === w ? 'bg-surface text-brand-gold-text shadow-xs' : 'text-text-secondary'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-text-secondary">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="py-1 px-2 bg-canvas border border-border rounded text-text-primary focus:outline-none"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </Card>

      {/* Degraded DB Banner */}
      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-control flex items-center gap-3 text-xs text-brand-gold-text">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Samples Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-canvas text-text-secondary font-semibold">
                <th className="py-2.5 px-3">Receipt Time (UTC)</th>
                <th className="py-2.5 px-3">Event ID</th>
                <th className="py-2.5 px-3">Channel</th>
                <th className="py-2.5 px-3 text-right">Voltage</th>
                <th className="py-2.5 px-3 text-right">Current</th>
                <th className="py-2.5 px-3 text-right">Power</th>
                <th className="py-2.5 px-3 text-right">Energy (Raw)</th>
                <th className="py-2.5 px-3 text-right">Freq</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {samples.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-text-secondary">
                    {loading ? 'Executing historical query...' : 'No historical telemetry records match query filters.'}
                  </td>
                </tr>
              ) : (
                samples.map((pkt) => {
                  const isCopied = copiedEventId === pkt.eventId;
                  return (
                    <tr key={pkt.eventId} className="hover:bg-canvas/50 transition-colors font-mono">
                      <td className="py-2.5 px-3 text-text-primary">
                        {new Date(pkt.receivedAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleCopyEventId(pkt.eventId)}
                          className="inline-flex items-center gap-1 text-[11px] text-text-secondary hover:text-brand-gold-text"
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
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 font-sans font-semibold">
                          Persisted
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-canvas border-t border-border flex items-center justify-between text-xs text-text-secondary">
          <span>{`Showing ${samples.length > 0 ? (page - 1) * pageSize + 1 : 0} to ${Math.min(page * pageSize, total)} of ${total} records`}</span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1 rounded border border-border bg-surface text-text-primary disabled:opacity-40 hover:bg-canvas"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-text-primary font-mono">{`${page} / ${totalPages}`}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1 rounded border border-border bg-surface text-text-primary disabled:opacity-40 hover:bg-canvas"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};
