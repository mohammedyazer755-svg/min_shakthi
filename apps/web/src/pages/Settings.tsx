import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../components';
import { useAuth } from '../auth/AuthContext';
import { useReducedMotion, type AnimationPreference } from '../motion';
import { API_BASE } from '../api';
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

export const Settings: React.FC = () => {
  const { user, accessToken, logout } = useAuth();
  const { animationPreference, setPreference, isReducedMotion } = useReducedMotion();
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
      const res = await fetch(`${API_BASE}/api/v1/users/me/preferences`, {
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
      const res = await fetch(`${API_BASE}/api/v1/sites/${user.siteId}/alerts/rules`, {
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
        const res = await fetch(`${API_BASE}/api/v1/users/sites/${user.siteId}/audit-logs?limit=10`, {
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
      const res = await fetch(`${API_BASE}/api/v1/users/me/preferences`, {
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
      const res = await fetch(`${API_BASE}/api/v1/sites/${user.siteId}/alerts/rules`, {
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
      const res = await fetch(`${API_BASE}/api/v1/sites/${user.siteId}/alerts/rules/${ruleId}`, {
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
            Account Preferences &amp; Platform Configuration
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            Manage user display preferences, security sessions, and administrative threshold rules.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={logout}
          className="inline-flex items-center gap-1.5"
          style={{
            color: 'var(--status-critical, #A52E2E)',
            borderColor: 'rgba(165,46,46,0.3)',
            background: 'rgba(165,46,46,0.06)',
          }}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account Profile & Preferences */}
        <div className="space-y-6">
          {/* Profile Card */}
          <div style={{ ...lightSurface, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <User style={{ width: 16, height: 16, color: 'var(--accent)' }} />
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>User Profile</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12 }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: 11, marginBottom: 2 }}>Display Name</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.displayName}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: 11, marginBottom: 2 }}>Email</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{user?.email}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: 11, marginBottom: 4 }}>Assigned Role</span>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    background: 'var(--accent-dim, rgba(163,132,69,0.12))',
                    color: 'var(--accent-text)',
                    border: '1px solid rgba(163,132,69,0.3)',
                  }}
                >
                  {user?.role}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: 11, marginBottom: 2 }}>Site Membership</span>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{user?.siteId}</span>
              </div>
            </div>
          </div>

          {/* Preferences Card */}
          <div style={{ ...lightSurface, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <SettingsIcon style={{ width: 16, height: 16, color: 'var(--accent)' }} />
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Display Preferences</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 12 }}>
              <div>
                <label htmlFor="settings-timezone-select" style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 6, fontSize: 11 }}>
                  Civil Timezone
                </label>
                <select
                  id="settings-timezone-select"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  style={{ ...lightInput, width: '100%' }}
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST · UTC+05:30)</option>
                  <option value="UTC">UTC (Universal Coordinated Time)</option>
                  <option value="America/New_York">America/New_York (EST · UTC-05:00)</option>
                </select>
              </div>

              <div>
                <label htmlFor="settings-device-select" style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 6, fontSize: 11 }}>
                  Default Device
                </label>
                <select
                  id="settings-device-select"
                  value={preferredDevice}
                  onChange={(e) => setPreferredDevice(e.target.value)}
                  style={{ ...lightInput, width: '100%', fontFamily: 'monospace' }}
                >
                  <option value="prototype1">prototype1</option>
                  <option value="prototype2">prototype2</option>
                </select>
              </div>

              <div>
                <label htmlFor="settings-motion-select" style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 6, fontSize: 11 }}>
                  Animation Preference
                </label>
                <select
                  id="settings-motion-select"
                  value={animationPreference}
                  onChange={(e) => setPreference(e.target.value as AnimationPreference)}
                  style={{ ...lightInput, width: '100%' }}
                >
                  <option value="system">System Default (Respects OS)</option>
                  <option value="reduce">Reduced Motion</option>
                  <option value="full">Full Motion</option>
                </select>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                  {isReducedMotion
                    ? '⚡ Reduced motion active (OS or user preference)'
                    : 'Fluid transitions active (OS reduced-motion request always takes precedence)'}
                </div>
              </div>

              <div style={{ paddingTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 }}>
                <div style={{ minWidth: 80 }}>
                  {prefsSaved && (
                    <span className="motion-feedback" style={{ fontSize: 12, color: 'var(--status-ok, #176344)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 style={{ width: 14, height: 14 }} />
                      <span>Saved</span>
                    </span>
                  )}
                </div>
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
          </div>
        </div>

        {/* Right Columns: Alert Rules Management & Audit Log */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rules Management Card */}
          <div style={{ ...lightSurface, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Threshold Alert Rules
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
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
              <div style={{ padding: 16, background: 'var(--canvas)', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12, fontSize: 12 }}>
                <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Create New Threshold Rule</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="settings-metric-select" style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 4, fontSize: 11 }}>Metric</label>
                    <select
                      id="settings-metric-select"
                      value={newMetric}
                      onChange={(e) => setNewMetric(e.target.value as 'voltage' | 'current' | 'power' | 'frequency')}
                      style={{ ...lightInput, width: '100%' }}
                    >
                      <option value="voltage">Voltage (V)</option>
                      <option value="current">Current (A)</option>
                      <option value="power">Power (W)</option>
                      <option value="frequency">Frequency (Hz)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="settings-operator-select" style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 4, fontSize: 11 }}>Operator</label>
                    <select
                      id="settings-operator-select"
                      value={newOperator}
                      onChange={(e) => setNewOperator(e.target.value as 'gt' | 'lt' | 'gte' | 'lte')}
                      style={{ ...lightInput, width: '100%' }}
                    >
                      <option value="gt">&gt; Greater Than</option>
                      <option value="gte">&gt;= Greater/Equal</option>
                      <option value="lt">&lt; Less Than</option>
                      <option value="lte">&lt;= Less/Equal</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="settings-threshold-input" style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 4, fontSize: 11 }}>Threshold Value</label>
                    <input
                      id="settings-threshold-input"
                      type="number"
                      step="any"
                      value={newThreshold}
                      onChange={(e) => setNewThreshold(Number(e.target.value))}
                      style={{ ...lightInput, width: '100%', fontFamily: 'monospace' }}
                    />
                  </div>

                  <div>
                    <label htmlFor="settings-hysteresis-input" style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 4, fontSize: 11 }}>Hysteresis</label>
                    <input
                      id="settings-hysteresis-input"
                      type="number"
                      step="any"
                      value={newHysteresis}
                      onChange={(e) => setNewHysteresis(Number(e.target.value))}
                      style={{ ...lightInput, width: '100%', fontFamily: 'monospace' }}
                    />
                  </div>

                  <div>
                    <label htmlFor="settings-debounce-input" style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 4, fontSize: 11 }}>Debounce (ms)</label>
                    <input
                      id="settings-debounce-input"
                      type="number"
                      value={newDebounceMs}
                      onChange={(e) => setNewDebounceMs(Number(e.target.value))}
                      style={{ ...lightInput, width: '100%', fontFamily: 'monospace' }}
                    />
                  </div>

                  <div>
                    <label htmlFor="settings-severity-select" style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: 4, fontSize: 11 }}>Severity</label>
                    <select
                      id="settings-severity-select"
                      value={newSeverity}
                      onChange={(e) => setNewSeverity(e.target.value as 'critical' | 'warning' | 'info')}
                      style={{ ...lightInput, width: '100%' }}
                    >
                      <option value="critical">Critical</option>
                      <option value="warning">Warning</option>
                      <option value="info">Info</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 6 }}>
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
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-strong)', background: 'var(--surface-raised, #F0F1EC)' }}>
                    <th style={thStyle}>Metric</th>
                    <th style={thStyle}>Condition</th>
                    <th style={thStyle}>Hysteresis</th>
                    <th style={thStyle}>Debounce</th>
                    <th style={thStyle}>Severity</th>
                    {isAdmin && <th style={{ ...thStyle, textAlign: 'right' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '32px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {loadingRules ? 'Loading rules...' : 'No alert rules configured.'}
                      </td>
                    </tr>
                  ) : (
                    rules.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                        <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                          {r.metric}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {`${r.operator} ${r.threshold}`}
                        </td>
                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                          {`±${r.hysteresis}`}
                        </td>
                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                          {`${r.debounceMs}ms`}
                        </td>
                        <td style={{ padding: '12px', fontFamily: 'sans-serif' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              background: r.severity === 'critical' ? 'rgba(165,46,46,0.12)' : 'rgba(128,83,0,0.12)',
                              color: r.severity === 'critical' ? 'var(--status-critical, #A52E2E)' : 'var(--status-warn, #805300)',
                            }}
                          >
                            {r.severity}
                          </span>
                        </td>
                        {isAdmin && (
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(r.id)}
                              style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                              title="Delete Rule"
                            >
                              <Trash2 style={{ width: 14, height: 14 }} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Log Card (Admin Only) */}
          {isAdmin && (
            <div style={{ ...lightSurface, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Administrative Configuration Audit Trail
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Immutable history of mapping revisions, rule changes, and alert acknowledgements.
                  </p>
                </div>
                <Shield style={{ width: 16, height: 16, color: 'var(--accent)' }} />
              </div>

              <div className="overflow-x-auto">
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-strong)', background: 'var(--surface-raised, #F0F1EC)' }}>
                      <th style={thStyle}>Timestamp</th>
                      <th style={thStyle}>Action</th>
                      <th style={thStyle}>Target</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontFamily: 'monospace' }}>
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No administrative actions recorded in current session.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((l) => (
                        <tr key={l.id} style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                          <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                            {new Date(l.at).toLocaleString()}
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                            {l.action}
                          </td>
                          <td style={{ padding: '10px 12px', color: 'var(--accent-text)' }}>
                            {l.target}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
