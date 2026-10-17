import React from 'react';
import { Server, Radio, ShieldAlert, History as AuditIcon, ArrowLeft } from 'lucide-react';
import { Devices } from './Devices';
import { RealTime } from './RealTime';
import { Settings } from './Settings';
import type { useLiveTelemetry } from '../live/useLiveTelemetry';
import { useAuth } from '../auth/AuthContext';

export interface ManageProps {
  telemetry: ReturnType<typeof useLiveTelemetry>;
  selectedDevice?: string;
  activeSubTab?: 'devices' | 'diagnostics' | 'audit';
  onNavigateSubTab?: (tab: 'devices' | 'diagnostics' | 'audit') => void;
  onNavigate?: (route: string) => void;
}

export const Manage: React.FC<ManageProps> = ({
  telemetry,
  selectedDevice = 'prototype1',
  activeSubTab = 'devices',
  onNavigateSubTab,
  onNavigate,
}) => {
  const { user } = useAuth();
  const isWorkspacePreview = import.meta.env.DEV && typeof window !== 'undefined' && (
    window.location.search.includes('view=workspace') ||
    window.location.hash === '#workspace'
  );
  const role = user?.role || (isWorkspacePreview ? 'admin' : undefined);

  // Access validation:
  // Admin: can access devices, diagnostics, audit
  // Operator: can access diagnostics only
  // Viewer: cannot access manage area
  const isDenied = !role || role === 'viewer' || (role === 'operator' && activeSubTab !== 'diagnostics');

  if (isDenied) {
    return (
      <div
        className="p-8 max-w-lg mx-auto my-12 rounded-2xl border text-center"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border-strong)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        }}
        role="alert"
        aria-live="polite"
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(128, 83, 0, 0.1)', color: 'var(--status-warn)' }}
        >
          <ShieldAlert className="w-6 h-6" aria-hidden="true" />
        </div>
        <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          Access Restricted
        </h2>
        <p className="text-xs leading-relaxed mt-2" style={{ color: 'var(--text-secondary)' }}>
          Your current account role (<strong>{role || 'unknown'}</strong>) does not have authorization to view this
          administrative area. {role === 'operator' ? 'Operators may access live Diagnostics.' : 'Please return to Overview or consult your site administrator.'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate?.('/overview')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: 'var(--accent)',
              color: '#FFFFFF',
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Return to Overview</span>
          </button>
          {role === 'operator' && (
            <button
              type="button"
              onClick={() => onNavigateSubTab?.('diagnostics')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <span>View Diagnostics</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const tabs = role === 'admin'
    ? [
        { id: 'devices' as const, label: 'Devices & Channel Mapping', icon: Server },
        { id: 'diagnostics' as const, label: 'Live Diagnostics', icon: Radio },
        { id: 'audit' as const, label: 'Security & Audit Logs', icon: AuditIcon },
      ]
    : [
        { id: 'diagnostics' as const, label: 'Live Diagnostics', icon: Radio },
      ];

  return (
    <div className="space-y-6">
      {/* Sub-navigation Tab Bar */}
      <div
        className="flex items-center gap-1 border-b pb-1"
        style={{ borderColor: 'var(--border)' }}
        role="tablist"
        aria-label="Administrative Tasks Sub-navigation"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onNavigateSubTab?.(tab.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold motion-interactive relative"
              style={{
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--surface)' : 'transparent',
                border: isActive ? '1px solid var(--border-strong)' : '1px solid transparent',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
              }}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" style={{ color: isActive ? 'var(--accent)' : 'inherit' }} />
              <span>{tab.label}</span>
              {isActive && (
                <span
                  className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Active SubTab View */}
      <div key={activeSubTab} className="motion-page-enter">
        {activeSubTab === 'devices' && (
          <Devices telemetry={telemetry} selectedDevice={selectedDevice} />
        )}
        {activeSubTab === 'diagnostics' && (
          <RealTime telemetry={telemetry} selectedDevice={selectedDevice} />
        )}
        {activeSubTab === 'audit' && (
          <Settings />
        )}
      </div>
    </div>
  );
};

export default Manage;
