import React, { useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AppShell, ComponentShowcase, Card } from './components';
import { useLiveTelemetry } from './live/useLiveTelemetry';
import { SignIn, Overview, OverallAnalytics, ChannelAnalytics, RealTime } from './pages';

const MainApp: React.FC = () => {
  const { status } = useAuth();
  const [selectedDevice, setSelectedDevice] = useState<string>('prototype1');
  const [activeRoute, setActiveRoute] = useState<string>('/overview');

  // Shared authenticated live telemetry store (singleton per tab session - R06, R07, T15)
  const telemetry = useLiveTelemetry(selectedDevice);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center text-text-secondary text-sm">
        <div className="w-8 h-8 rounded-full border-2 border-brand-gold border-t-transparent animate-spin mb-3" />
        <span>Authenticating session...</span>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <SignIn onSuccess={() => setActiveRoute('/overview')} />;
  }

  return (
    <AppShell
      selectedDevice={selectedDevice}
      onSelectDevice={setSelectedDevice}
      availableDevices={['prototype1', 'prototype2']}
      activeRoute={activeRoute}
      onNavigate={setActiveRoute}
    >
      {activeRoute === '/overview' && (
        <Overview telemetry={telemetry} selectedDevice={selectedDevice} />
      )}
      {activeRoute === '/analytics' && (
        <OverallAnalytics telemetry={telemetry} selectedDevice={selectedDevice} />
      )}
      {activeRoute === '/channels' && (
        <ChannelAnalytics telemetry={telemetry} selectedDevice={selectedDevice} />
      )}
      {activeRoute === '/live' && (
        <RealTime telemetry={telemetry} selectedDevice={selectedDevice} />
      )}
      {activeRoute === '/showcase' && <ComponentShowcase />}

      {/* Placeholders for Phase 5 routes */}
      {['/history', '/reports', '/alerts', '/settings'].includes(activeRoute) && (
        <Card className="text-center py-16 px-4">
          <div className="inline-block px-3 py-1 bg-amber-50 text-brand-gold-text border border-amber-200 rounded text-xs font-semibold uppercase tracking-wider mb-3">
            Phase 5 Scope
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Route: {activeRoute}
          </h2>
          <p className="text-xs text-text-secondary max-w-md mx-auto mb-6 leading-relaxed">
            Historical aggregations, audited tariff reports, configurable threshold rules, and user settings are scheduled for Phase 5.
            Active live operational monitoring is live on Overview, Analytics, Channels, and Real-Time.
          </p>
          <button
            type="button"
            onClick={() => setActiveRoute('/overview')}
            className="text-xs font-semibold text-brand-gold-text underline hover:no-underline"
          >
            Return to Live Overview
          </button>
        </Card>
      )}
    </AppShell>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
