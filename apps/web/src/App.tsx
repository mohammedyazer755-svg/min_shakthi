import React, { useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AppShell, ComponentShowcase } from './components';
import { useLiveTelemetry } from './live/useLiveTelemetry';
import {
  SignIn,
  Overview,
  OverallAnalytics,
  ChannelAnalytics,
  RealTime,
  History,
  Reports,
  Alerts,
  Devices,
  Settings,
} from './pages';

export const MainApp: React.FC = () => {
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
      {activeRoute === '/history' && (
        <History telemetry={telemetry} selectedDevice={selectedDevice} />
      )}
      {activeRoute === '/reports' && (
        <Reports telemetry={telemetry} selectedDevice={selectedDevice} />
      )}
      {activeRoute === '/alerts' && (
        <Alerts telemetry={telemetry} selectedDevice={selectedDevice} />
      )}
      {activeRoute === '/devices' && (
        <Devices telemetry={telemetry} selectedDevice={selectedDevice} />
      )}
      {activeRoute === '/settings' && <Settings />}
      {activeRoute === '/showcase' && <ComponentShowcase />}
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
