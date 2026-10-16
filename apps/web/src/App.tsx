import React, { useState } from 'react';
import { AuthProvider } from './auth/AuthContext';
import { AppShell, ComponentShowcase } from './components';
import { IntegrationView } from './pages/IntegrationView';

export const App: React.FC = () => {
  const [selectedDevice, setSelectedDevice] = useState('prototype1');
  const [activeRoute, setActiveRoute] = useState('/live');

  return (
    <AuthProvider>
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
          <IntegrationView />
        )}
      </AppShell>
    </AuthProvider>
  );
};

export default App;
