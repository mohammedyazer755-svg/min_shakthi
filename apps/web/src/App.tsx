import React, { useState } from 'react';
import { AppShell, ComponentShowcase, Card } from './components';

export const App: React.FC = () => {
  const [selectedDevice, setSelectedDevice] = useState('prototype1');
  const [activeRoute, setActiveRoute] = useState('/showcase');

  return (
    <AppShell
      selectedDevice={selectedDevice}
      onSelectDevice={setSelectedDevice}
      availableDevices={['prototype1', 'prototype2']}
      activeRoute={activeRoute}
      onNavigate={setActiveRoute}
    >
      {activeRoute === '/showcase' ? (
        <ComponentShowcase />
      ) : (
        <Card className="text-center py-16 px-4">
          <div className="inline-block px-3 py-1 bg-amber-50 text-brand-gold-text border border-amber-200 rounded text-xs font-semibold uppercase tracking-wider mb-3">
            Phase 1 Foundation
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Route: {activeRoute}
          </h2>
          <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
            Production live operational screens require Phase 2 (MQTT Ingestion) and Phase 3 (Database and Auth).
            Per the non-negotiable contract, no fake authenticated dashboard or unverified live data is presented.
          </p>
          <button
            type="button"
            onClick={() => setActiveRoute('/showcase')}
            className="text-sm font-semibold text-brand-gold-text underline hover:no-underline"
          >
            Switch to Component Showcase (TEST ONLY)
          </button>
        </Card>
      )}
    </AppShell>
  );
};

export default App;
