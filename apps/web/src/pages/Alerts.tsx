import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../components';
import { useAuth } from '../auth/AuthContext';
import { API_BASE } from '../api';
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
  X,
} from 'lucide-react';
import type { AlertRecord } from '@minsakthi/contracts';

export interface AlertsProps {
  telemetry: UseLiveTelemetryResult;
  selectedDevice: string;
  onNavigate?: (route: string) => void;
}

const lightSurface: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  boxShadow: 'var(--shadow-card)',
};

export const Alerts: React.FC<AlertsProps> = ({ selectedDevice, onNavigate }) => {
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

      const res = await fetch(`${API_BASE}/api/v1/sites/${user.siteId}/alerts?${params.toString()}`, {
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

  const ackTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!ackModalAlertId) {
      if (ackTriggerRef.current && typeof ackTriggerRef.current.focus === 'function') {
        ackTriggerRef.current.focus();
        ackTriggerRef.current = null;
      }
      return;
    }

    if (!ackTriggerRef.current && typeof document !== 'undefined') {
      ackTriggerRef.current = document.activeElement as HTMLElement | null;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAckModalAlertId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ackModalAlertId]);

  const handleAcknowledge = async (alertId: string) => {
    if (!accessToken || !user) return;
    setSubmittingAck(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/sites/${user.siteId}/alerts/${alertId}/ack`, {
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
            Electrical Threshold Alerts &amp; Event Log
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
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
              background: 'rgba(23,99,68,0.1)',
              border: '1px solid rgba(23,99,68,0.25)',
              color: 'var(--status-ok, #176344)',
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
                background: stateFilter === s ? 'var(--surface)' : 'transparent',
                color: stateFilter === s ? 'var(--accent-text)' : 'var(--text-secondary)',
                boxShadow: stateFilter === s ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
          {`Total: ${alerts.length} alerts recorded`}
        </span>
      </div>

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

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div
            style={{
              ...lightSurface,
              padding: '48px 16px',
              textAlign: 'center',
            }}
          >
            <Bell style={{ width: 32, height: 32, color: 'var(--text-dim)', margin: '0 auto 8px', opacity: 0.5 }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>No alerts found</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              No active or historical threshold violations match the current filter.
            </p>
          </div>
        ) : (
          alerts.map((alt) => {
            const isResolved = alt.state === 'resolved';
            const isAck = alt.state === 'acknowledged';
            const isCrit = alt.rule?.severity === 'critical';

            const cardBorder = isResolved
              ? 'var(--border)'
              : isCrit
              ? 'rgba(165,46,46,0.35)'
              : 'rgba(128,83,0,0.35)';

            const cardBg = isResolved
              ? 'var(--surface-raised, #F0F1EC)'
              : isCrit
              ? 'rgba(165,46,46,0.04)'
              : 'var(--surface)';

            return (
              <div
                key={alt.id}
                style={{
                  background: cardBg,
                  border: `1px solid ${cardBorder}`,
                  borderRadius: 12,
                  padding: '16px 20px',
                  boxShadow: 'var(--shadow-card)',
                  opacity: isResolved ? 0.75 : 1,
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
                          background: isCrit ? 'rgba(165,46,46,0.12)' : 'rgba(128,83,0,0.12)',
                          color: isCrit ? 'var(--status-critical, #A52E2E)' : 'var(--status-warn, #805300)',
                          border: `1px solid ${isCrit ? 'rgba(165,46,46,0.25)' : 'rgba(128,83,0,0.25)'}`,
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
                          background: alt.state === 'open' ? 'rgba(165,46,46,0.12)' : alt.state === 'acknowledged' ? 'rgba(128,83,0,0.12)' : 'rgba(23,99,68,0.12)',
                          color: alt.state === 'open' ? 'var(--status-critical, #A52E2E)' : alt.state === 'acknowledged' ? 'var(--status-warn, #805300)' : 'var(--status-ok, #176344)',
                        }}
                      >
                        {alt.state}
                      </span>

                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                        {alt.deviceId} · {alt.channelId || 'all channels'}
                      </span>
                    </div>

                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 0' }}>
                      {`Violation: ${alt.rule?.metric?.toUpperCase() || 'ELECTRICAL'} reached ${alt.triggerValue}`}
                    </h4>

                    {alt.rule && (
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace', margin: 0 }}>
                        {`Rule: ${alt.rule.metric} ${alt.rule.operator} ${alt.rule.threshold} · Debounce: ${alt.rule.debounceMs}ms · Hysteresis: ${alt.rule.hysteresis}`}
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--text-secondary)', paddingTop: 4 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock style={{ width: 12, height: 12 }} />
                        <span>{`Opened: ${new Date(alt.openedAt).toLocaleString()}`}</span>
                      </span>
                      {alt.resolvedAt && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--status-ok, #176344)' }}>
                          <CheckCircle style={{ width: 12, height: 12 }} />
                          <span>{`Resolved: ${new Date(alt.resolvedAt).toLocaleString()}`}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {onNavigate && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onNavigate(`/insights/incidents?deviceId=${encodeURIComponent(alt.deviceId)}`)}
                      >
                        Investigate Event →
                      </Button>
                    )}
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
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Acknowledgement Audit Trail:
                    </span>
                    {alt.acknowledgements.map((ack) => (
                      <div
                        key={ack.id}
                        style={{
                          padding: '8px 12px',
                          background: 'var(--canvas)',
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          fontSize: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <User style={{ width: 14, height: 14, color: 'var(--accent)' }} />
                          <strong style={{ color: 'var(--text-primary)' }}>{ack.userDisplayName || ack.userId}</strong>
                          {ack.note && (
                            <span style={{ fontStyle: 'italic', color: 'var(--text-primary)' }}>"{ack.note}"</span>
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
          role="dialog"
          aria-modal="true"
          aria-labelledby="ack-modal-title"
          className="motion-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            className="motion-modal-card"
            style={{
              width: '100%',
              maxWidth: 440,
              padding: 24,
              background: 'var(--surface)',
              border: '1px solid var(--border-strong)',
              borderRadius: 16,
              boxShadow: 'var(--shadow-modal, 0 20px 48px rgba(0,0,0,0.2))',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MessageSquare style={{ width: 16, height: 16, color: 'var(--accent)' }} />
                <h3 id="ack-modal-title" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Acknowledge Threshold Alert
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAckModalAlertId(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: 4,
                }}
                aria-label="Close dialog"
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Acknowledging records your identity and timestamp as verified observer. The alert remains active until the metric clears the hysteresis boundary.
            </p>

            <div>
              <label
                htmlFor="ack-note-input"
                style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: 6 }}
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
                  background: 'var(--canvas)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--text-primary)',
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
