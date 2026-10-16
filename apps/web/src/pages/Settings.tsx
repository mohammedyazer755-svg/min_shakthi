import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button } from '../components';
import { useAuth } from '../auth/AuthContext';
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Save,
  Trash2,
  Plus,
  CheckCircle2,
  LogOut,
} from 'lucide-react';
import type { AlertRule } from '@minsakthi/contracts';

interface AuditLogEntry {
  id: string;
  action: string;
  target: string;
  at: string;
}

export const Settings: React.FC = () => {
  const { user, accessToken, logout } = useAuth();
  const [timezone, setTimezone] = useState<string>('Asia/Kolkata');
  const [preferredDevice, setPreferredDevice] = useState<string>('prototype1');
  const [savingPrefs, setSavingPrefs] = useState<boolean>(false);
  const [prefsSaved, setPrefsSaved] = useState<boolean>(false);

  // Alert Rules
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loadingRules, setLoadingRules] = useState<boolean>(false);
  const [showAddRule, setShowAddRule] = useState<boolean>(false);

  // New Rule Form
  const [newMetric, setNewMetric] = useState<'voltage' | 'current' | 'power' | 'frequency'>('voltage');
  const [newOperator, setNewOperator] = useState<'gt' | 'lt' | 'gte' | 'lte'>('gt');
  const [newThreshold, setNewThreshold] = useState<number>(250);
  const [newHysteresis, setNewHysteresis] = useState<number>(5);
  const [newDebounceMs, setNewDebounceMs] = useState<number>(3000);
  const [newSeverity, setNewSeverity] = useState<'critical' | 'warning' | 'info'>('critical');

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const fetchSettingsData = useCallback(async () => {
    if (!accessToken || !user) return;

    // Load preferences
    try {
      const res = await fetch('/api/v1/users/me/preferences', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.timezone) setTimezone(data.timezone);
        if (data.preferredDeviceId) setPreferredDevice(data.preferredDeviceId);
      }
    } catch {
      // Ignored
    }

    // Load rules
    setLoadingRules(true);
    try {
      const res = await fetch(`/api/v1/sites/${user.siteId}/alerts/rules`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules || []);
      }
    } catch {
      // Ignored
    } finally {
      setLoadingRules(false);
    }

    // Load audit logs if admin
    if (user.role === 'admin') {
      try {
        const res = await fetch(`/api/v1/users/sites/${user.siteId}/audit-logs?limit=10`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAuditLogs(data.logs || []);
        }
      } catch {
        // Ignored
      }
    }
  }, [accessToken, user]);

  useEffect(() => {
    fetchSettingsData();
  }, [fetchSettingsData]);

  const handleSavePreferences = async () => {
    if (!accessToken || !user) return;
    setSavingPrefs(true);
    try {
      const res = await fetch('/api/v1/users/me/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          timezone,
          preferredDeviceId: preferredDevice,
        }),
      });
      if (res.ok) {
        setPrefsSaved(true);
        setTimeout(() => setPrefsSaved(false), 2500);
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleCreateRule = async () => {
    if (!accessToken || !user || user.role !== 'admin') return;

    try {
      const res = await fetch(`/api/v1/sites/${user.siteId}/alerts/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          deviceId: preferredDevice,
          metric: newMetric,
          operator: newOperator,
          threshold: newThreshold,
          hysteresis: newHysteresis,
          debounceMs: newDebounceMs,
          severity: newSeverity,
          enabled: true,
        }),
      });

      if (res.ok) {
        setShowAddRule(false);
        fetchSettingsData();
      } else {
        alert('Failed to save alert rule.');
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!accessToken || !user || user.role !== 'admin') return;

    try {
      const res = await fetch(`/api/v1/sites/${user.siteId}/alerts/rules/${ruleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setRules((prev) => prev.filter((r) => r.id !== ruleId));
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface p-4 rounded-card border border-border">
        <div>
          <h2 className="text-base font-bold text-text-primary tracking-tight">
            Account Preferences &amp; Platform Configuration
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Manage user display preferences, security sessions, and administrative threshold rules.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={logout}
          className="inline-flex items-center gap-1.5 text-status-critical border-status-critical/30 hover:bg-status-critical/10"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account Profile & Preferences */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card className="p-4 bg-surface border border-border space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <User className="w-4 h-4 text-brand-gold-text" />
              <h3 className="text-sm font-semibold text-text-primary">User Profile</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-text-secondary block">Display Name</span>
                <span className="font-semibold text-text-primary">{user?.displayName}</span>
              </div>
              <div>
                <span className="text-text-secondary block">Email</span>
                <span className="font-mono text-text-primary">{user?.email}</span>
              </div>
              <div>
                <span className="text-text-secondary block">Assigned Role</span>
                <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-gold/20 text-brand-gold-text">
                  {user?.role}
                </span>
              </div>
              <div>
                <span className="text-text-secondary block">Site Membership</span>
                <span className="font-mono text-[11px] text-text-secondary break-all">{user?.siteId}</span>
              </div>
            </div>
          </Card>

          {/* Preferences Card */}
          <Card className="p-4 bg-surface border border-border space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <SettingsIcon className="w-4 h-4 text-brand-gold-text" />
              <h3 className="text-sm font-semibold text-text-primary">Display Preferences</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="settings-timezone-select" className="block text-text-secondary mb-1">Civil Timezone</label>
                <select
                  id="settings-timezone-select"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full py-1.5 px-2.5 bg-canvas border border-border rounded text-text-primary font-medium focus:outline-none"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST · UTC+05:30)</option>
                  <option value="UTC">UTC (Universal Coordinated Time)</option>
                  <option value="America/New_York">America/New_York (EST · UTC-05:00)</option>
                </select>
              </div>

              <div>
                <label htmlFor="settings-device-select" className="block text-text-secondary mb-1">Default Device</label>
                <select
                  id="settings-device-select"
                  value={preferredDevice}
                  onChange={(e) => setPreferredDevice(e.target.value)}
                  className="w-full py-1.5 px-2.5 bg-canvas border border-border rounded text-text-primary font-medium focus:outline-none"
                >
                  <option value="prototype1">prototype1</option>
                  <option value="prototype2">prototype2</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-between">
                {prefsSaved && (
                  <span className="text-xs text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Saved</span>
                  </span>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSavePreferences}
                  disabled={savingPrefs}
                  className="ml-auto inline-flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingPrefs ? 'Saving...' : 'Save'}</span>
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Columns: Alert Rules Management & Audit Log */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rules Management Card */}
          <Card className="p-0 overflow-hidden bg-surface border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text-primary tracking-tight">
                  Threshold Alert Rules
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Durable alert criteria with debounce delays and hysteresis deadbands.
                </p>
              </div>

              {isAdmin && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddRule(!showAddRule)}
                  className="inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Rule</span>
                </Button>
              )}
            </div>

            {/* Add Rule Form */}
            {showAddRule && (
              <div className="p-4 bg-canvas border-b border-border space-y-3 text-xs">
                <h4 className="font-bold text-text-primary">Create New Threshold Rule</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="settings-metric-select" className="block text-text-secondary mb-1">Metric</label>
                    <select
                      id="settings-metric-select"
                      value={newMetric}
                      onChange={(e) => setNewMetric(e.target.value as 'voltage' | 'current' | 'power' | 'frequency')}
                      className="w-full p-1.5 bg-surface border border-border rounded"
                    >
                      <option value="voltage">Voltage (V)</option>
                      <option value="current">Current (A)</option>
                      <option value="power">Power (W)</option>
                      <option value="frequency">Frequency (Hz)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="settings-operator-select" className="block text-text-secondary mb-1">Operator</label>
                    <select
                      id="settings-operator-select"
                      value={newOperator}
                      onChange={(e) => setNewOperator(e.target.value as 'gt' | 'lt' | 'gte' | 'lte')}
                      className="w-full p-1.5 bg-surface border border-border rounded"
                    >
                      <option value="gt">&gt; Greater Than</option>
                      <option value="gte">&gt;= Greater/Equal</option>
                      <option value="lt">&lt; Less Than</option>
                      <option value="lte">&lt;= Less/Equal</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="settings-threshold-input" className="block text-text-secondary mb-1">Threshold Value</label>
                    <input
                      id="settings-threshold-input"
                      type="number"
                      step="any"
                      value={newThreshold}
                      onChange={(e) => setNewThreshold(Number(e.target.value))}
                      className="w-full p-1.5 bg-surface border border-border rounded font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="settings-hysteresis-input" className="block text-text-secondary mb-1">Hysteresis</label>
                    <input
                      id="settings-hysteresis-input"
                      type="number"
                      step="any"
                      value={newHysteresis}
                      onChange={(e) => setNewHysteresis(Number(e.target.value))}
                      className="w-full p-1.5 bg-surface border border-border rounded font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="settings-debounce-input" className="block text-text-secondary mb-1">Debounce (ms)</label>
                    <input
                      id="settings-debounce-input"
                      type="number"
                      value={newDebounceMs}
                      onChange={(e) => setNewDebounceMs(Number(e.target.value))}
                      className="w-full p-1.5 bg-surface border border-border rounded font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="settings-severity-select" className="block text-text-secondary mb-1">Severity</label>
                    <select
                      id="settings-severity-select"
                      value={newSeverity}
                      onChange={(e) => setNewSeverity(e.target.value as 'critical' | 'warning' | 'info')}
                      className="w-full p-1.5 bg-surface border border-border rounded"
                    >
                      <option value="critical">Critical</option>
                      <option value="warning">Warning</option>
                      <option value="info">Info</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowAddRule(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleCreateRule}>
                    Save Rule
                  </Button>
                </div>
              </div>
            )}

            {/* Rules Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-canvas text-text-secondary font-semibold">
                    <th className="py-2.5 px-3">Metric</th>
                    <th className="py-2.5 px-3">Condition</th>
                    <th className="py-2.5 px-3">Hysteresis</th>
                    <th className="py-2.5 px-3">Debounce</th>
                    <th className="py-2.5 px-3">Severity</th>
                    {isAdmin && <th className="py-2.5 px-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-text-secondary">
                        {loadingRules ? 'Loading rules...' : 'No alert rules configured.'}
                      </td>
                    </tr>
                  ) : (
                    rules.map((r) => (
                      <tr key={r.id} className="hover:bg-canvas/50 font-mono">
                        <td className="py-3 px-3 font-semibold text-text-primary uppercase">
                          {r.metric}
                        </td>
                        <td className="py-3 px-3">
                          {`${r.operator} ${r.threshold}`}
                        </td>
                        <td className="py-3 px-3 text-text-secondary">
                          {`±${r.hysteresis}`}
                        </td>
                        <td className="py-3 px-3 text-text-secondary">
                          {`${r.debounceMs}ms`}
                        </td>
                        <td className="py-3 px-3 font-sans">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              r.severity === 'critical' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {r.severity}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(r.id)}
                              className="text-text-secondary hover:text-red-700 p-1"
                              title="Delete Rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Audit Log Card (Admin Only) */}
          {isAdmin && (
            <Card className="p-0 overflow-hidden bg-surface border border-border">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary tracking-tight">
                    Administrative Configuration Audit Trail
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Immutable history of mapping revisions, rule changes, and alert acknowledgements.
                  </p>
                </div>
                <Shield className="w-4 h-4 text-brand-gold-text" />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-canvas text-text-secondary font-semibold">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Target</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-text-secondary">
                          No administrative actions recorded in current session.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((l) => (
                        <tr key={l.id} className="hover:bg-canvas/50">
                          <td className="py-2.5 px-3 text-text-secondary">
                            {new Date(l.at).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-text-primary">
                            {l.action}
                          </td>
                          <td className="py-2.5 px-3 text-brand-gold-text">
                            {l.target}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
