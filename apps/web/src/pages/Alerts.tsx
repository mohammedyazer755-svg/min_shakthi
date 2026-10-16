import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '../components';
import { useAuth } from '../auth/AuthContext';
import type { UseLiveTelemetryResult } from '../live/useLiveTelemetry';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  ShieldCheck,
  User,
  MessageSquare,
} from 'lucide-react';
import type { AlertRecord } from '@minsakthi/contracts';

export interface AlertsProps {
  telemetry: UseLiveTelemetryResult;
  selectedDevice: string;
}

export const Alerts: React.FC<AlertsProps> = ({ selectedDevice }) => {
  const { accessToken, user } = useAuth();
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [stateFilter, setStateFilter] = useState<'all' | 'open' | 'acknowledged' | 'resolved'>('all');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [ackModalAlertId, setAckModalAlertId] = useState<string | null>(null);
  const [ackNote, setAckNote] = useState<string>('');
  const [submittingAck, setSubmittingAck] = useState<boolean>(false);

  const fetchAlerts = useCallback(async () => {
    if (!accessToken || !user) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ deviceId: selectedDevice });
      if (stateFilter !== 'all') {
        params.set('state', stateFilter);
      }

      const res = await fetch(`/api/v1/sites/${user.siteId}/alerts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to load alerts: ${res.statusText}`);
      }

      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, user, selectedDevice, stateFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleAcknowledge = async (alertId: string) => {
    if (!accessToken || !user) return;
    setSubmittingAck(true);

    try {
      const res = await fetch(`/api/v1/sites/${user.siteId}/alerts/${alertId}/ack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ note: ackNote }),
      });

      if (!res.ok) {
        throw new Error(`Acknowledgement failed: ${res.statusText}`);
      }

      setAckModalAlertId(null);
      setAckNote('');
      fetchAlerts();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmittingAck(false);
    }
  };

  const isOperatorOrAdmin = user?.role === 'operator' || user?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface p-4 rounded-card border border-border">
        <div>
          <h2 className="text-base font-bold text-text-primary tracking-tight">
            Electrical Threshold Alerts &amp; Event Log
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Durable rule evaluations with sustained debounce, clear hysteresis, and independent multi-user acknowledgements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Evaluation: Active &amp; Healthy</span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchAlerts}
            disabled={loading}
            className="inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 rounded-card border border-border text-xs">
        <div className="inline-flex rounded border border-border p-0.5 bg-canvas">
          {(['all', 'open', 'acknowledged', 'resolved'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStateFilter(s)}
              className={`px-3 py-1 rounded text-xs font-semibold capitalize ${
                stateFilter === s ? 'bg-surface text-brand-gold-text shadow-xs' : 'text-text-secondary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <span className="text-text-secondary font-mono">
          {`Total: ${alerts.length} alerts recorded`}
        </span>
      </div>

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-control flex items-center gap-3 text-xs text-brand-gold-text">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <Card className="p-12 text-center text-text-secondary bg-surface border border-border">
            <Bell className="w-8 h-8 text-brand-gold/40 mx-auto mb-2" />
            <p className="text-sm font-semibold text-text-primary">No alerts found</p>
            <p className="text-xs text-text-secondary mt-1">
              No active or historical threshold violations match the current filter.
            </p>
          </Card>
        ) : (
          alerts.map((alt) => {
            const isResolved = alt.state === 'resolved';
            const isAck = alt.state === 'acknowledged';

            return (
              <Card
                key={alt.id}
                className={`p-4 border transition-all ${
                  isResolved
                    ? 'border-border bg-surface opacity-80'
                    : isAck
                    ? 'border-brand-gold/40 bg-surface'
                    : 'border-status-critical/30 bg-surface shadow-subtle'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          alt.rule?.severity === 'critical'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {alt.rule?.severity || 'WARNING'}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                          alt.state === 'open'
                            ? 'bg-rose-100 text-rose-800'
                            : alt.state === 'acknowledged'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {alt.state}
                      </span>

                      <span className="text-xs font-semibold text-text-primary font-mono">
                        {alt.deviceId} · {alt.channelId || 'all channels'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-text-primary">
                      {`Violation: ${alt.rule?.metric?.toUpperCase() || 'ELECTRICAL'} reached ${alt.triggerValue}`}
                    </h4>

                    {alt.rule && (
                      <p className="text-xs text-text-secondary font-mono">
                        {`Rule: ${alt.rule.metric} ${alt.rule.operator} ${alt.rule.threshold} · Debounce: ${alt.rule.debounceMs}ms · Hysteresis: ${alt.rule.hysteresis}`}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-text-secondary pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{`Opened: ${new Date(alt.openedAt).toLocaleString()}`}</span>
                      </span>
                      {alt.resolvedAt && (
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle className="w-3 h-3" />
                          <span>{`Resolved: ${new Date(alt.resolvedAt).toLocaleString()}`}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions & Acknowledged Info */}
                  <div className="flex flex-col items-end gap-2">
                    {alt.state !== 'resolved' && (
                      <Button
                        variant={isAck ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => {
                          setAckModalAlertId(alt.id);
                          setAckNote('');
                        }}
                        disabled={!isOperatorOrAdmin}
                        title={!isOperatorOrAdmin ? 'Operator or Admin role required' : undefined}
                      >
                        {isAck ? 'Update Note' : 'Acknowledge'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Acknowledgements History Trail (T21) */}
                {alt.acknowledgements && alt.acknowledgements.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                    <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block">
                      Acknowledgement Audit Trail:
                    </span>
                    {alt.acknowledgements.map((ack) => (
                      <div
                        key={ack.id}
                        className="p-2 bg-canvas rounded text-xs flex items-center justify-between text-text-secondary"
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-brand-gold-text" />
                          <strong className="text-text-primary">{ack.userDisplayName || ack.userId}</strong>
                          {ack.note && (
                            <span className="text-text-secondary italic">"{ack.note}"</span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono">
                          {new Date(ack.ackAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Acknowledge Modal */}
      {ackModalAlertId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 bg-surface border border-border shadow-elevation space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-gold-text" />
              <h3 className="text-sm font-bold text-text-primary">Acknowledge Threshold Alert</h3>
            </div>
            <p className="text-xs text-text-secondary">
              Acknowledging records your identity and timestamp as verified observer. The alert remains active until the metric clears the hysteresis boundary.
            </p>

            <div>
              <label htmlFor="ack-note-input" className="block text-xs font-semibold text-text-primary mb-1">
                Investigation Note (Optional):
              </label>
              <textarea
                id="ack-note-input"
                rows={3}
                value={ackNote}
                onChange={(e) => setAckNote(e.target.value)}
                placeholder="e.g. Inspecting main breaker; load adjustment initiated"
                className="w-full p-2.5 bg-canvas border border-border rounded text-xs text-text-primary focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAckModalAlertId(null)}
                disabled={submittingAck}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAcknowledge(ackModalAlertId)}
                disabled={submittingAck}
              >
                {submittingAck ? 'Recording...' : 'Confirm Acknowledgment'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
