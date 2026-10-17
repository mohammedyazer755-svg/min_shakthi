import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { RouterProvider, useRouter } from './router';
import { AppShell, ComponentShowcase } from './components';
import { useLiveTelemetry } from './live/useLiveTelemetry';
import { API_BASE } from './api';
import {
  LandingPage,
  Overview,
  ChannelAnalytics,
  Alerts,
  Settings,
  Insights,
  Manage,
} from './pages';

export const MainAppContent: React.FC = () => {
  const { user, status, accessToken } = useAuth();
  const {
    canonicalPath,
    selectedDevice,
    selectDevice,
    navigate,
    isAllowedRoute,
  } = useRouter();

  // Fetch real configured site devices from backend if available
  const [configuredDevices, setConfiguredDevices] = useState<string[]>(['prototype1', 'prototype2']);
  const [devicesLoaded, setDevicesLoaded] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated' || !user?.siteId) return;

    let mounted = true;
    async function loadDevices() {
      try {
        const res = await fetch(`${API_BASE}/api/v1/sites/${user!.siteId}/devices`, {
          credentials: 'include',
          headers: { Authorization:`Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = (await res.json()) as { devices?: Array<{ rawDeviceId: string }> };
          if (mounted && data.devices && Array.isArray(data.devices)) {
            const list = data.devices.map((d) => d.rawDeviceId);
            setConfiguredDevices(list);
            setDevicesLoaded(true);

            // If selectedDevice is not in configured list and list is non-empty, auto-select first
            if (list.length > 0 && !list.includes(selectedDevice)) {
              selectDevice(list[0]!);
            }
          }
        }
      } catch {
        // Fall back gracefully to local default list
        if (mounted) setDevicesLoaded(true);
      }
    }

    loadDevices();
    return () => {
      mounted = false;
    };
  }, [status, user?.siteId, accessToken, selectedDevice, selectDevice]);

  // Shared authenticated live telemetry store (singleton per tab session - R06, R07, T15)
  // Kept mounted above all route transitions so socket is never torn down on page switch
  const telemetry = useLiveTelemetry(selectedDevice);

  if (status === 'loading') {
    return (
      <div
        data-theme="light"
        className="min-h-screen flex flex-col items-center justify-center text-sm"
        style={{ background: 'var(--canvas)', color: 'var(--text-secondary)' }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin mb-3"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
        />
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>Authenticating session...</span>
      </div>
    );
  }

  const isWorkspacePreview = typeof window !== 'undefined' && (
    window.location.search.includes('view=workspace') ||
    window.location.hash === '#workspace'
  );

  if (status === 'unauthenticated' && !isWorkspacePreview) {
    return (
      <div data-theme="dark" className="min-h-screen">
        <LandingPage onSuccess={() => navigate('/overview')} />
      </div>
    );
  }

  // Render route content
  const renderRoute = () => {
    if (!isAllowedRoute) {
      return (
        <Manage
          telemetry={telemetry}
          selectedDevice={selectedDevice}
          onNavigate={navigate}
        />
      );
    }

    if (canonicalPath === '/overview') {
      return <Overview telemetry={telemetry} selectedDevice={selectedDevice} onNavigate={navigate} />;
    }

    if (canonicalPath === '/channels') {
      return <ChannelAnalytics telemetry={telemetry} selectedDevice={selectedDevice} />;
    }

    if (canonicalPath.startsWith('/insights')) {
      const subTab = canonicalPath.endsWith('/history')
        ? 'history'
        : canonicalPath.endsWith('/reports')
          ? 'reports'
          : canonicalPath.endsWith('/incidents')
            ? 'incidents'
            : 'trends';

      return (
        <Insights
          telemetry={telemetry}
          selectedDevice={selectedDevice}
          activeSubTab={subTab}
          onNavigateSubTab={(tab) => navigate(`/insights/${tab}`)}
        />
      );
    }

    if (canonicalPath === '/alerts') {
      return <Alerts telemetry={telemetry} selectedDevice={selectedDevice} onNavigate={navigate} />;
    }

    if (canonicalPath.startsWith('/manage')) {
      const subTab = canonicalPath.endsWith('/diagnostics')
        ? 'diagnostics'
        : canonicalPath.endsWith('/audit')
          ? 'audit'
          : 'devices';

      return (
        <Manage
          telemetry={telemetry}
          selectedDevice={selectedDevice}
          activeSubTab={subTab}
          onNavigateSubTab={(tab) => navigate(`/manage/${tab}`)}
          onNavigate={navigate}
        />
      );
    }

    if (canonicalPath === '/settings') {
      return <Settings />;
    }

    if (canonicalPath === '/showcase') {
      return <ComponentShowcase />;
    }

    // Default fallback
    return <Overview telemetry={telemetry} selectedDevice={selectedDevice} onNavigate={navigate} />;
  };

  return (
    <div data-theme="light" className="min-h-screen motion-auth-reveal">
      <AppShell
        selectedDevice={selectedDevice}
        onSelectDevice={selectDevice}
        availableDevices={configuredDevices}
        activeRoute={canonicalPath}
        onNavigate={navigate}
        health={telemetry.health}
        channels={telemetry.channels}
        socketConnected={telemetry.connectionState === 'connected'}
      >
        {/* Honest warning if device is not in configured list */}
        {devicesLoaded && configuredDevices.length > 0 && !configuredDevices.includes(selectedDevice) && (
          <div
            className="mb-4 p-3 rounded-lg border text-xs flex items-center justify-between"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--status-warn)',
              color: 'var(--text-primary)',
            }}
            role="status"
          >
            <span>
              Device <strong>{selectedDevice}</strong> is not recognized for this site.
            </span>
            <button
              type="button"
              onClick={() => selectDevice(configuredDevices[0]!)}
              className="px-2.5 py-1 rounded text-xs font-semibold"
              style={{ background: 'var(--accent)', color: '#FFF' }}
            >
              Switch to {configuredDevices[0]}
            </button>
          </div>
        )}

        {renderRoute()}
      </AppShell>
    </div>
  );
};

export const MainApp: React.FC = () => {
  const { user } = useAuth();
  const isWorkspacePreview = typeof window !== 'undefined' && (
    window.location.search.includes('view=workspace') ||
    window.location.hash === '#workspace'
  );
  const effectiveRole = user?.role || (isWorkspacePreview ? 'admin' : undefined);

  return (
    <RouterProvider userRole={effectiveRole}>
      <MainAppContent />
    </RouterProvider>
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
