import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '../components';
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
        // Optimistic locking conflict (R15)
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
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface p-4 rounded-card border border-border">
        <div>
          <h2 className="text-base font-bold text-text-primary tracking-tight">
            Device Diagnostics &amp; Channel Mapping Editor
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Configure hardware slot assignments (CH01–CH05) with optimistic version locking and audit logging.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-canvas rounded border border-border text-xs text-text-secondary font-mono">
            <Layers className="w-3.5 h-3.5 text-brand-gold-text" aria-hidden="true" />
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
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-control flex items-center justify-between text-xs text-brand-gold-text">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
            <span className="font-semibold">{error}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchDevice}>
            Reload Current Mappings
          </Button>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-control flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Device channel mappings successfully committed and cached.</span>
        </div>
      )}

      {!isAdmin && (
        <div className="p-3 bg-canvas border border-border rounded-control flex items-center gap-2 text-xs text-text-secondary">
          <Lock className="w-3.5 h-3.5 text-brand-gold-text" />
          <span>Channel mapping modification requires Administrator credentials. Viewing in read-only mode.</span>
        </div>
      )}

      {/* Diagnostics Cards */}
      {diagnostics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-surface border border-border">
            <span className="text-xs text-text-secondary font-medium">Broker Transport Link</span>
            <div className="mt-1 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-status-positive animate-pulse" />
              <span className="text-base font-bold font-mono text-text-primary capitalize">
                {diagnostics.brokerStatus}
              </span>
            </div>
            <span className="text-[11px] text-text-secondary mt-1 block font-mono">
              Dedicated Ingest Pipeline
            </span>
          </Card>

          <Card className="p-4 bg-surface border border-border">
            <span className="text-xs text-text-secondary font-medium">Expected Interval</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-text-primary">
                {`${diagnostics.expectedIntervalMs}ms`}
              </span>
              <span className="text-[11px] text-text-secondary font-mono">
                {`±${diagnostics.intervalJitterMs}ms jitter`}
              </span>
            </div>
            <span className="text-[11px] text-text-secondary mt-1 block">
              Configured per ESP32 firmware
            </span>
          </Card>

          <Card className="p-4 bg-surface border border-border">
            <span className="text-xs text-text-secondary font-medium">Quarantined Packets</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-text-primary">
                {diagnostics.quarantineCount}
              </span>
              <span className="text-[11px] text-text-secondary">dropped</span>
            </div>
            <span className="text-[11px] text-text-secondary mt-1 block">
              Malformed / NaN packets rejected
            </span>
          </Card>

          <Card className="p-4 bg-surface border border-border">
            <span className="text-xs text-text-secondary font-medium">Device Status</span>
            <div className="mt-1 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-status-positive" />
              <span className="text-base font-bold text-text-primary font-mono">
                {diagnostics.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <span className="text-[11px] text-text-secondary mt-1 block font-mono">
              {diagnostics.rawDeviceId}
            </span>
          </Card>
        </div>
      )}

      {/* Mapping Editor Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-border bg-surface flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary tracking-tight">
              Hardware Channel Mappings (CH01–CH05)
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Assign physical ESP32 telemetry keys to operational UI slots. Unmapped channels are preserved in raw storage.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-canvas text-text-secondary font-semibold">
                <th className="py-2.5 px-3">Raw Channel ID</th>
                <th className="py-2.5 px-3">Display Slot</th>
                <th className="py-2.5 px-3">Operational Label</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mappings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-text-secondary">
                    {loading ? 'Loading channel configuration...' : 'No channels discovered for this hardware device.'}
                  </td>
                </tr>
              ) : (
                mappings.map((m) => (
                  <tr key={m.channelId} className="hover:bg-canvas/50 transition-colors">
                    <td className="py-3 px-3 font-mono font-medium text-text-primary">
                      {m.channelId}
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={m.displaySlot ? String(m.displaySlot) : 'none'}
                        onChange={(e) => handleSlotChange(m.channelId, e.target.value)}
                        disabled={!isAdmin}
                        className="py-1 px-2.5 bg-canvas border border-border rounded text-text-primary font-semibold text-xs focus:outline-none disabled:opacity-60"
                      >
                        <option value="none">Unmapped (—)</option>
                        <option value="1">CH01 (Slot 1)</option>
                        <option value="2">CH02 (Slot 2)</option>
                        <option value="3">CH03 (Slot 3)</option>
                        <option value="4">CH04 (Slot 4)</option>
                        <option value="5">CH05 (Slot 5)</option>
                      </select>
                    </td>

                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={m.label}
                        onChange={(e) => handleLabelChange(m.channelId, e.target.value)}
                        disabled={!isAdmin}
                        className="w-full max-w-sm py-1 px-2.5 bg-canvas border border-border rounded text-text-primary text-xs focus:outline-none disabled:opacity-60"
                      />
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(m.channelId)}
                        disabled={!isAdmin}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                          m.enabled
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        } disabled:pointer-events-none disabled:opacity-60`}
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
      </Card>
    </div>
  );
};
