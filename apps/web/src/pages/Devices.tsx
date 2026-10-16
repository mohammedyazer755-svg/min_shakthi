import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../components';
import { useAuth } from '../auth/AuthContext';
import type { UseLiveTelemetryResult } from '../live/useLiveTelemetry';
import {
  Layers,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import type { DeviceDiagnostics, ChannelMappingItem } from '@minsakthi/contracts';

export interface DevicesProps {
  telemetry: UseLiveTelemetryResult;
  selectedDevice: string;
}

const darkSurface: React.CSSProperties = {
  background: 'var(--dark-surface)',
  border: '1px solid var(--dark-border)',
  borderRadius: 12,
};

const metricBoxStyle: React.CSSProperties = {
  background: 'var(--dark-surface)',
  border: '1px solid var(--dark-border)',
  borderRadius: 12,
  padding: '20px 24px',
  borderTop: '2px solid var(--dark-accent)',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  color: 'var(--dark-text-muted)',
};

const darkInput: React.CSSProperties = {
  padding: '6px 10px',
  background: 'var(--dark-canvas, #050507)',
  border: '1px solid var(--dark-border-strong)',
  borderRadius: 6,
  color: 'var(--dark-text-primary)',
  fontSize: 12,
  fontWeight: 500,
  outline: 'none',
};

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  color: 'var(--dark-text-muted)',
  fontWeight: 700,
  textTransform: 'uppercase',
  fontSize: 10,
  letterSpacing: '0.1em',
};

export const Devices: React.FC<DevicesProps> = ({ selectedDevice }) => {
  const { accessToken, user } = useAuth();
  const [diagnostics, setDiagnostics] = useState<DeviceDiagnostics | null>(null);
  const [mappings, setMappings] = useState<ChannelMappingItem[]>([]);
  const [configVersion, setConfigVersion] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const fetchDevice = useCallback(async () => {
    if (!accessToken || !user) return;
    setLoading(true);
    setError(null);
    setConflictError(false);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/v1/sites/${user.siteId}/devices/${selectedDevice}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to load device details: ${res.statusText}`);
      }

      const data: DeviceDiagnostics = await res.json();
      setDiagnostics(data);
      setConfigVersion(data.configVersion);

      // Map to editable items
      setMappings(
        data.channels.map((c) => ({
          channelId: c.rawChannelId,
          displaySlot: c.displaySlot,
          label: c.label,
          enabled: c.enabled,
        }))
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, user, selectedDevice]);

  useEffect(() => {
    fetchDevice();
  }, [fetchDevice]);

  const handleSlotChange = (channelId: string, slotStr: string) => {
    const slot = slotStr === 'none' ? null : Number(slotStr);
    setMappings((prev) =>
      prev.map((m) => (m.channelId === channelId ? { ...m, displaySlot: slot } : m))
    );
  };

  const handleLabelChange = (channelId: string, label: string) => {
    setMappings((prev) =>
      prev.map((m) => (m.channelId === channelId ? { ...m, label } : m))
    );
  };

  const handleToggleEnabled = (channelId: string) => {
    setMappings((prev) =>
      prev.map((m) => (m.channelId === channelId ? { ...m, enabled: !m.enabled } : m))
    );
  };

  const handleSaveMappings = async () => {
    if (!accessToken || !user) return;
    setSaving(true);
    setError(null);
    setConflictError(false);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/v1/sites/${user.siteId}/devices/${selectedDevice}/mapping`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          expectedConfigVersion: configVersion,
          mappings,
        }),
      });

      if (res.status === 409) {
        setConflictError(true);
        setError('Configuration conflict: Device mappings were updated by another administrator. Please reload current state.');
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to save mappings: ${res.statusText}`);
      }

      const data = await res.json();
      setConfigVersion(data.configVersion);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
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
            Device Diagnostics &amp; Channel Mapping Editor
          </h2>
          <p style={{ fontSize: 12, color: 'var(--dark-text-muted)', marginTop: 2 }}>
            Configure hardware slot assignments (CH01–CH05) with optimistic version locking and audit logging.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
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
            <Layers style={{ width: 14, height: 14, color: 'var(--dark-accent)' }} aria-hidden="true" />
            <span>{`Config Version: v${configVersion}`}</span>
          </span>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchDevice}
            disabled={loading || saving}
            className="inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Reload</span>
          </Button>

          {isAdmin && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveMappings}
              disabled={saving || loading}
              className="inline-flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{saving ? 'Saving...' : 'Save Mappings'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Conflict / Error Banner */}
      {conflictError && (
        <div
          style={{
            padding: 16,
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: 'var(--dark-accent)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} aria-hidden="true" />
            <span style={{ fontWeight: 600 }}>{error}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchDevice}>
            Reload Current Mappings
          </Button>
        </div>
      )}

      {saveSuccess && (
        <div
          style={{
            padding: 12,
            background: 'rgba(34,212,124,0.1)',
            border: '1px solid rgba(34,212,124,0.25)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: 'var(--dark-status-ok)',
          }}
        >
          <CheckCircle2 style={{ width: 16, height: 16, flexShrink: 0 }} />
          <span>Device channel mappings successfully committed and cached.</span>
        </div>
      )}

      {!isAdmin && (
        <div
          style={{
            padding: 12,
            background: 'var(--dark-canvas, #050507)',
            border: '1px solid var(--dark-border)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: 'var(--dark-text-muted)',
          }}
        >
          <Lock style={{ width: 14, height: 14, color: 'var(--dark-accent)' }} />
          <span>Channel mapping modification requires Administrator credentials. Viewing in read-only mode.</span>
        </div>
      )}

      {/* Diagnostics Cards */}
      {diagnostics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div style={metricBoxStyle}>
            <span style={sectionLabel}>Broker Transport Link</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: diagnostics.brokerStatus === 'connected' ? '#22c55e' : '#f59e0b', display: 'inline-block' }} />
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: 'var(--dark-text-primary)', textTransform: 'capitalize' }}>
                {diagnostics.brokerStatus}
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--dark-text-muted)', fontFamily: 'monospace', marginTop: 4 }}>
              Dedicated Ingest Pipeline
            </span>
          </div>

          <div style={metricBoxStyle}>
            <span style={sectionLabel}>Expected Interval</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'monospace', color: 'var(--dark-text-primary)' }}>
                {`${diagnostics.expectedIntervalMs}ms`}
              </span>
              <span style={{ fontSize: 11, color: 'var(--dark-text-muted)', fontFamily: 'monospace' }}>
                {diagnostics.intervalJitterMs === null ? 'Jitter not measured' : `±${diagnostics.intervalJitterMs}ms jitter`}
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--dark-text-muted)', marginTop: 4 }}>
              Configured per ESP32 firmware
            </span>
          </div>

          <div style={metricBoxStyle}>
            <span style={sectionLabel}>Quarantined Packets</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'monospace', color: 'var(--dark-text-primary)' }}>
                {diagnostics.quarantineCount ?? '—'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--dark-text-muted)' }}>dropped</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--dark-text-muted)', marginTop: 4 }}>
              Malformed / NaN packets rejected
            </span>
          </div>

          <div style={metricBoxStyle}>
            <span style={sectionLabel}>Device Status</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: 'var(--dark-text-primary)' }}>
                {diagnostics.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--dark-text-muted)', fontFamily: 'monospace', marginTop: 4 }}>
              {diagnostics.rawDeviceId}
            </span>
          </div>
        </div>
      )}

      {/* Mapping Editor Table */}
      <div style={{ ...darkSurface, padding: '20px 24px' }}>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark-text-primary)', margin: 0 }}>
            Hardware Channel Mappings (CH01–CH05)
          </h3>
          <p style={{ fontSize: 12, color: 'var(--dark-text-muted)', marginTop: 2 }}>
            Assign physical ESP32 telemetry keys to operational UI slots. Unmapped channels are preserved in raw storage.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--dark-border-strong)', background: 'transparent' }}>
                <th style={thStyle}>Raw Channel ID</th>
                <th style={{ ...thStyle, color: 'var(--dark-accent)' }}>Display Slot</th>
                <th style={thStyle}>Operational Label</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {mappings.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '32px 12px', textAlign: 'center', color: 'var(--dark-text-muted)' }}>
                    {loading ? 'Loading channel configuration...' : 'No channels discovered for this hardware device.'}
                  </td>
                </tr>
              ) : (
                mappings.map((m) => (
                  <tr key={m.channelId} style={{ borderBottom: '1px solid var(--dark-border)', color: 'var(--dark-text-primary)' }}>
                    <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--dark-text-primary)' }}>
                      {m.channelId}
                    </td>

                    <td style={{ padding: '12px' }}>
                      <select
                        value={m.displaySlot ? String(m.displaySlot) : 'none'}
                        onChange={(e) => handleSlotChange(m.channelId, e.target.value)}
                        disabled={!isAdmin}
                        style={{
                          ...darkInput,
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          opacity: !isAdmin ? 0.6 : 1,
                        }}
                      >
                        <option value="none">Unmapped (—)</option>
                        <option value="1">CH01 (Slot 1)</option>
                        <option value="2">CH02 (Slot 2)</option>
                        <option value="3">CH03 (Slot 3)</option>
                        <option value="4">CH04 (Slot 4)</option>
                        <option value="5">CH05 (Slot 5)</option>
                      </select>
                    </td>

                    <td style={{ padding: '12px' }}>
                      <input
                        type="text"
                        value={m.label}
                        onChange={(e) => handleLabelChange(m.channelId, e.target.value)}
                        disabled={!isAdmin}
                        style={{
                          ...darkInput,
                          width: '100%',
                          maxWidth: 320,
                          opacity: !isAdmin ? 0.6 : 1,
                        }}
                      />
                    </td>

                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(m.channelId)}
                        disabled={!isAdmin}
                        style={{
                          padding: '3px 10px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 700,
                          border: 'none',
                          cursor: !isAdmin ? 'not-allowed' : 'pointer',
                          background: m.enabled ? 'rgba(34,212,124,0.12)' : 'rgba(85,85,95,0.2)',
                          color: m.enabled ? '#22d47c' : 'var(--dark-text-muted)',
                          opacity: !isAdmin ? 0.6 : 1,
                        }}
                      >
                        {m.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
