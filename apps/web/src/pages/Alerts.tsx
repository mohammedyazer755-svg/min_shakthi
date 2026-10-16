import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../components';
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

const darkSurface: React.CSSProperties = {
  background: 'var(--dark-surface)',
  border: '1px solid var(--dark-border)',
  borderRadius: 12,
};

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
      <div
        style={{
          ...darkSurface,
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark-text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Electrical Threshold Alerts &amp; Event Log
          </h2>
          <p style={{ fontSize: 12, color: 'var(--dark-text-muted)', marginTop: 2 }}>
            Durable rule evaluations with sustained debounce, clear hysteresis, and independent multi-user acknowledgements.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 6,
              background: 'rgba(34,212,124,0.1)',
              border: '1px solid rgba(34,212,124,0.25)',
              color: 'var(--dark-status-ok)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <ShieldCheck style={{ width: 14, height: 14 }} aria-hidden="true" />
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
      <div
        style={{
          ...darkSurface,
          padding: '12px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: 12,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            borderRadius: 6,
            border: '1px solid var(--dark-border)',
            background: 'var(--dark-canvas, #050507)',
            padding: 2,
            gap: 2,
          }}
        >
          {(['all', 'open', 'acknowledged', 'resolved'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStateFilter(s)}
              style={{
                padding: '4px 12px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                textTransform: 'capitalize',
                background: stateFilter === s ? 'var(--dark-surface)' : 'transparent',
                color: stateFilter === s ? 'var(--dark-accent)' : 'var(--dark-text-muted)',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <span style={{ color: 'var(--dark-text-muted)', fontFamily: 'monospace' }}>
          {`Total: ${alerts.length} alerts recorded`}
        </span>
      </div>

      {error && (
        <div
          style={{
            padding: 16,
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 12,
            color: 'var(--dark-accent)',
          }}
        >
          <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div
            style={{
              ...darkSurface,
              padding: '48px 16px',
              textAlign: 'center',
            }}
          >
            <Bell style={{ width: 32, height: 32, color: 'var(--dark-text-dim)', margin: '0 auto 8px', opacity: 0.5 }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark-text-primary)', margin: 0 }}>No alerts found</p>
            <p style={{ fontSize: 12, color: 'var(--dark-text-muted)', marginTop: 4 }}>
              No active or historical threshold violations match the current filter.
            </p>
          </div>
        ) : (
          alerts.map((alt) => {
            const isResolved = alt.state === 'resolved';
            const isAck = alt.state === 'acknowledged';
            const isCrit = alt.rule?.severity === 'critical';

            const cardBorder = isResolved
              ? 'var(--dark-border)'
              : isCrit
              ? 'rgba(245,101,101,0.35)'
              : 'rgba(200,169,110,0.35)';

            const cardBg = isResolved
              ? 'var(--dark-surface)'
              : isCrit
              ? 'rgba(245,101,101,0.04)'
              : 'var(--dark-surface)';

            return (
              <div
                key={alt.id}
                style={{
                  background: cardBg,
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 12,
                  padding: '16px 20px',
                  opacity: isResolved ? 0.7 : 1,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          background: isCrit ? 'rgba(245,101,101,0.15)' : 'rgba(245,158,11,0.15)',
                          color: isCrit ? '#f87171' : '#fbbf24',
                          border: `1px solid ${isCrit ? 'rgba(245,101,101,0.3)' : 'rgba(245,158,11,0.3)'}`,
                        }}
                      >
                        {alt.rule?.severity || 'WARNING'}
                      </span>

                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          background: alt.state === 'open' ? 'rgba(244,63,94,0.15)' : alt.state === 'acknowledged' ? 'rgba(245,158,11,0.15)' : 'rgba(34,212,124,0.12)',
                          color: alt.state === 'open' ? '#fb7185' : alt.state === 'acknowledged' ? '#f59e0b' : '#22d47c',
                        }}
                      >
                        {alt.state}
                      </span>

                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark-text-primary)', fontFamily: 'monospace' }}>
                        {alt.deviceId} · {alt.channelId || 'all channels'}
                      </span>
                    </div>

                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark-text-primary)', margin: '4px 0 0' }}>
                      {`Violation: ${alt.rule?.metric?.toUpperCase() || 'ELECTRICAL'} reached ${alt.triggerValue}`}
                    </h4>

                    {alt.rule && (
                      <p style={{ fontSize: 12, color: 'var(--dark-text-muted)', fontFamily: 'monospace', margin: 0 }}>
                        {`Rule: ${alt.rule.metric} ${alt.rule.operator} ${alt.rule.threshold} · Debounce: ${alt.rule.debounceMs}ms · Hysteresis: ${alt.rule.hysteresis}`}
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--dark-text-muted)', paddingTop: 4 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock style={{ width: 12, height: 12 }} />
                        <span>{`Opened: ${new Date(alt.openedAt).toLocaleString()}`}</span>
                      </span>
                      {alt.resolvedAt && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--dark-status-ok)' }}>
                          <CheckCircle style={{ width: 12, height: 12 }} />
                          <span>{`Resolved: ${new Date(alt.resolvedAt).toLocaleString()}`}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
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

                {/* Audit Trail */}
                {alt.acknowledgements && alt.acknowledgements.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--dark-border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--dark-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Acknowledgement Audit Trail:
                    </span>
                    {alt.acknowledgements.map((ack) => (
                      <div
                        key={ack.id}
                        style={{
                          padding: '8px 12px',
                          background: 'var(--dark-canvas, #050507)',
                          borderRadius: 6,
                          border: '1px solid var(--dark-border)',
                          fontSize: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          color: 'var(--dark-text-muted)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <User style={{ width: 14, height: 14, color: 'var(--dark-accent)' }} />
                          <strong style={{ color: 'var(--dark-text-primary)' }}>{ack.userDisplayName || ack.userId}</strong>
                          {ack.note && (
                            <span style={{ fontStyle: 'italic', color: 'var(--dark-text-primary)' }}>"{ack.note}"</span>
                          )}
                        </div>
                        <span style={{ fontSize: 11, fontFamily: 'monospace' }}>
                          {new Date(ack.ackAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Acknowledge Modal */}
      {ackModalAlertId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              padding: 24,
              background: 'var(--dark-surface-raised)',
              border: '1px solid var(--dark-border-strong)',
              borderRadius: 16,
              boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare style={{ width: 16, height: 16, color: 'var(--dark-accent)' }} />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark-text-primary)', margin: 0 }}>
                Acknowledge Threshold Alert
              </h3>
            </div>
            <p style={{ fontSize: 12, color: 'var(--dark-text-muted)', margin: 0, lineHeight: 1.5 }}>
              Acknowledging records your identity and timestamp as verified observer. The alert remains active until the metric clears the hysteresis boundary.
            </p>

            <div>
              <label
                htmlFor="ack-note-input"
                style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--dark-text-muted)', marginBottom: 6 }}
              >
                Investigation Note (Optional):
              </label>
              <textarea
                id="ack-note-input"
                rows={3}
                value={ackNote}
                onChange={(e) => setAckNote(e.target.value)}
                placeholder="e.g. Inspecting main breaker; load adjustment initiated"
                style={{
                  width: '100%',
                  padding: 10,
                  background: 'var(--dark-canvas, #050507)',
                  border: '1px solid var(--dark-border-strong)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--dark-text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
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
          </div>
        </div>
      )}
    </div>
  );
};
