import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../components';
import { useAuth } from '../auth/AuthContext';
import { API_BASE } from '../api';
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

const lightSurface: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  boxShadow: 'var(--shadow-card)',
};

const lightInput: React.CSSProperties = {
  padding: '6px 10px',
  background: 'var(--canvas)',
  border: '1px solid var(--border-strong)',
  borderRadius: 6,
  color: 'var(--text-primary)',
  fontSize: 12,
  fontWeight: 500,
  outline: 'none',
};

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  color: 'var(--text-secondary)',
  fontWeight: 700,
  textTransform: 'uppercase',
  fontSize: 10,
  letterSpacing: '0.1em',
};

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
        `${API_BASE}/api/v1/sites/${user.siteId}/devices/${selectedDevice}/history?${params.toString()}`,
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
        `${API_BASE}/api/v1/sites/${user.siteId}/devices/${selectedDevice}/export?${params.toString()}`,
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
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Historical Telemetry Logs &amp; Audit
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            Query immutable historical readings with deterministic cutoff and formula-escaped CSV exports.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          {cutoff && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                background: 'var(--canvas)',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                fontFamily: 'monospace',
              }}
            >
              <Clock style={{ width: 13, height: 13, color: 'var(--accent)' }} aria-hidden="true" />
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
      <div
        style={{
          ...lightSurface,
          padding: '12px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: 12,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
            <Filter style={{ width: 13, height: 13, color: 'var(--accent)' }} aria-hidden="true" />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Channel:</span>
            <select
              value={selectedChannel}
              onChange={(e) => {
                setSelectedChannel(e.target.value);
                setPage(1);
              }}
              style={lightInput}
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Window:</span>
            <div
              style={{
                display: 'inline-flex',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--canvas)',
                padding: 2,
                gap: 2,
              }}
            >
              {(['1h', '24h', '7d'] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    setTimeRange(w);
                    setPage(1);
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    background: timeRange === w ? 'var(--surface)' : 'transparent',
                    color: timeRange === w ? 'var(--accent-text)' : 'var(--text-secondary)',
                    boxShadow: timeRange === w ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            style={lightInput}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Degraded DB Banner */}
      {error && (
        <div
          style={{
            padding: 16,
            background: 'var(--status-warn-bg, rgba(128,83,0,0.08))',
            border: '1px solid var(--status-warn, #805300)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 12,
            color: 'var(--status-warn, #805300)',
          }}
        >
          <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Samples Table */}
      <div style={{ ...lightSurface, overflow: 'hidden' }}>
        <div className="overflow-x-auto">
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-strong)', background: 'var(--surface-raised, #F0F1EC)' }}>
                <th style={thStyle}>Receipt Time (UTC)</th>
                <th style={thStyle}>Event ID</th>
                <th style={{ ...thStyle, color: 'var(--accent-text)' }}>Channel</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Voltage</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Current</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Power</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Energy (Raw)</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Freq</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {samples.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '48px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {loading ? 'Executing historical query...' : 'No historical telemetry records match query filters.'}
                  </td>
                </tr>
              ) : (
                samples.map((pkt) => {
                  const isCopied = copiedEventId === pkt.eventId;
                  return (
                    <tr
                      key={pkt.eventId}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        fontFamily: 'monospace',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        {new Date(pkt.receivedAt).toLocaleString()}
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
                            color: 'var(--text-secondary)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                          title="Click to copy full Event ID"
                        >
                          <span>{`${pkt.eventId.slice(0, 8)}...`}</span>
                          {isCopied ? (
                            <Check style={{ width: 11, height: 11, color: 'var(--status-ok, #176344)' }} aria-hidden="true" />
                          ) : (
                            <Copy style={{ width: 11, height: 11 }} aria-hidden="true" />
                          )}
                        </button>
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'sans-serif', fontWeight: 600, color: 'var(--accent-text)' }}>
                        {pkt.channelId}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {`${pkt.values.voltage.toFixed(2)} V`}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {`${pkt.values.current.toFixed(2)} A`}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        {`${pkt.values.power.toFixed(2)} W`}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>
                        {pkt.values.energyRaw}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {`${pkt.values.frequency.toFixed(2)} Hz`}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontFamily: 'sans-serif',
                            fontWeight: 700,
                            background: 'rgba(23,99,68,0.10)',
                            color: 'var(--status-ok, #176344)',
                            border: '1px solid rgba(23,99,68,0.20)',
                          }}
                        >
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
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--canvas)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}
        >
          <span>{`Showing ${samples.length > 0 ? (page - 1) * pageSize + 1 : 0} to ${Math.min(page * pageSize, total)} of ${total} records`}</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                cursor: page <= 1 || loading ? 'not-allowed' : 'pointer',
                opacity: page <= 1 || loading ? 0.4 : 1,
              }}
              title="Previous Page"
            >
              <ChevronLeft style={{ width: 14, height: 14 }} />
            </button>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
              {`${page} / ${totalPages}`}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-primary)',
                cursor: page >= totalPages || loading ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages || loading ? 0.4 : 1,
              }}
              title="Next Page"
            >
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
