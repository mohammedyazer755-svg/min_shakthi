import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useLiveTelemetry } from '../live/useLiveTelemetry';
import { Card, Button, Input, ErrorBanner, FreshnessLabel } from '../components';

export const IntegrationView: React.FC = () => {
  const { user, status, error, login, logout, clearError } = useAuth();
  const [selectedDevice, setSelectedDevice] = useState<string>('prototype1');

  // Form states for sign in
  const [email, setEmail] = useState('admin@minsakthi.local');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    connectionState,
    channels,
    health,
    coverage,
    lastDisplayLatencyMs,
  } = useLiveTelemetry(selectedDevice);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await login(email, password);
    setIsSubmitting(false);
  };

  const handlePrefill = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('');
    clearError();
  };

  if (status === 'loading') {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-charcoal-light)' }}>
        Authenticating session...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner & Authentication Bar */}
      <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-gold-dark)', fontWeight: 600 }}>
            Phase 3 Vertical Slice
          </div>
          <h1 style={{ margin: '0.25rem 0 0', fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-charcoal)' }}>
            MIN-SAKTHI ENERGY INTELLIGENCE V2
          </h1>
        </div>

        {status === 'authenticated' && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-charcoal)' }}>
                {user.displayName}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-charcoal-light)', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <span>{user.email}</span>
                <span>•</span>
                <span style={{ fontWeight: 600, color: 'var(--color-gold-dark)', textTransform: 'uppercase' }}>
                  {user.role}
                </span>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => logout()}>
              Sign Out
            </Button>
          </div>
        ) : (
          <div style={{ fontSize: '0.875rem', color: 'var(--color-charcoal-light)' }}>
            Unauthenticated · In-memory tokens only
          </div>
        )}
      </Card>

      {/* Unauthenticated Login Card */}
      {status === 'unauthenticated' && (
        <Card style={{ maxWidth: '440px', margin: '2rem auto', width: '100%' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 1rem', color: 'var(--color-charcoal)' }}>
            Sign In with Site Role
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-charcoal-light)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
            Access tokens are held strictly in browser memory for 5 minutes. Refresh tokens rotate in an HttpOnly secure cookie.
          </p>

          {error && <ErrorBanner title="Authentication Error" message={error} onDismiss={clearError} />}

          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input
              label="Work Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" variant="primary" disabled={isSubmitting} style={{ width: '100%', marginTop: '0.5rem' }}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-charcoal-light)', marginBottom: '0.5rem' }}>
              Quick Test Profiles (Select user to prefill):
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button size="sm" variant="secondary" onClick={() => handlePrefill('admin@minsakthi.local')}>
                Admin
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handlePrefill('operator@minsakthi.local')}>
                Operator
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handlePrefill('viewer@minsakthi.local')}>
                Viewer
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Authenticated Dashboard View */}
      {status === 'authenticated' && (
        <>
          {/* Controls & Connection Status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label htmlFor="device-select" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-charcoal)' }}>
                Target Device:
              </label>
              <select
                id="device-select"
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                  color: 'var(--color-charcoal)',
                }}
              >
                <option value="prototype1">prototype1 (5 Channels Configured)</option>
                <option value="prototype2">prototype2 (1 Channel Configured)</option>
              </select>
            </div>

            {/* Live Badges */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Socket Status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.75rem',
                  padding: '0.3rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: connectionState === 'connected' ? 'var(--color-emerald)' : 'var(--color-crimson)',
                  }}
                />
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>Socket {connectionState}</span>
              </div>

              {/* Ingest Broker Status */}
              <div
                style={{
                  fontSize: '0.75rem',
                  padding: '0.3rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: health?.broker === 'connected' ? 'var(--color-emerald)' : 'var(--color-charcoal-light)',
                }}
              >
                Broker: <strong>{health?.broker ?? 'unknown'}</strong>
              </div>

              {/* Coverage */}
              {coverage && (
                <div
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.3rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: coverage.partial ? 'var(--color-amber-dark)' : 'var(--color-emerald)',
                  }}
                >
                  {coverage.reportingSlots}/{coverage.configuredSlots} reporting
                  {coverage.partial ? ' · Partial' : ''}
                </div>
              )}

              {/* Display ACK Latency */}
              {lastDisplayLatencyMs !== null && (
                <div
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.3rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: lastDisplayLatencyMs <= 1000 ? 'var(--color-emerald)' : 'var(--color-crimson)',
                  }}
                >
                  Display ACK: <strong>{lastDisplayLatencyMs}ms</strong>
                </div>
              )}
            </div>
          </div>

          {/* 5-Slot Channel Matrix */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            {channels.map((ch, idx) => {
              const sample = ch.lastSample;
              return (
                <Card
                  key={ch.displaySlot ?? idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    opacity: ch.freshness === 'unconfigured' ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-gold-dark)' }}>
                        SLOT {ch.displaySlot ?? '—'}
                      </div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-charcoal)' }}>
                        {ch.label}
                      </div>
                    </div>
                    <FreshnessLabel freshness={ch.freshness} />
                  </div>

                  {/* Electrical Values Table */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.5rem',
                      fontSize: '0.8125rem',
                      paddingTop: '0.5rem',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--color-charcoal-light)' }}>Voltage: </span>
                      <strong>{sample?.values.voltage != null ? `${sample.values.voltage.toFixed(2)} V` : '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-charcoal-light)' }}>Current: </span>
                      <strong>{sample?.values.current != null ? `${sample.values.current.toFixed(2)} A` : '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-charcoal-light)' }}>Power: </span>
                      <strong>{sample?.values.power != null ? `${sample.values.power.toFixed(2)} W` : '—'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--color-charcoal-light)' }}>Freq: </span>
                      <strong>{sample?.values.frequency != null ? `${sample.values.frequency.toFixed(2)} Hz` : '—'}</strong>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: 'var(--color-charcoal-light)' }}>
                    <span>Raw Energy: </span>
                    <code>{sample?.values.energyRaw ?? '—'}</code>
                  </div>

                  {ch.lastReceivedAt && (
                    <div style={{ fontSize: '0.6875rem', color: 'var(--color-charcoal-light)', marginTop: 'auto' }}>
                      Last received: {new Date(ch.lastReceivedAt).toLocaleTimeString()}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
