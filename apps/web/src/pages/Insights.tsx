import React from 'react';
import { BarChart2, History as HistoryIcon, FileText, ZapOff, Zap } from 'lucide-react';
import { OverallAnalytics } from './OverallAnalytics';
import { History } from './History';
import { Reports } from './Reports';
import { PowerEventInvestigator } from '../features/incidents';
import { EnergyUsage } from './EnergyUsage';
import type { useLiveTelemetry } from '../live/useLiveTelemetry';

export interface InsightsProps {
  telemetry: ReturnType<typeof useLiveTelemetry>;
  selectedDevice?: string;
  activeSubTab?: 'trends' | 'history' | 'reports' | 'incidents' | 'energy';
  onNavigateSubTab?: (tab: 'trends' | 'history' | 'reports' | 'incidents' | 'energy') => void;
}

export const Insights: React.FC<InsightsProps> = ({
  telemetry,
  selectedDevice = 'prototype1',
  activeSubTab = 'trends',
  onNavigateSubTab,
}) => {
  const tabs = [
    { id: 'trends' as const, label: 'Trends & Telemetry', icon: BarChart2 },
    { id: 'energy' as const, label: 'Energy & Billing (₹)', icon: Zap },
    { id: 'history' as const, label: 'History & Logs', icon: HistoryIcon },
    { id: 'reports' as const, label: 'Civil Reports', icon: FileText },
    { id: 'incidents' as const, label: 'Event Investigator', icon: ZapOff },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-navigation Tab Bar */}
      <div
        className="flex items-center gap-1 border-b pb-1"
        style={{ borderColor: 'var(--border)' }}
        role="tablist"
        aria-label="Insights Sub-navigation"
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

      {/* Active Tab View */}
      <div key={activeSubTab} className="motion-page-enter">
        {activeSubTab === 'trends' && (
          <OverallAnalytics telemetry={telemetry} selectedDevice={selectedDevice} />
        )}
        {activeSubTab === 'energy' && (
          <EnergyUsage telemetry={telemetry} selectedDevice={selectedDevice} />
        )}
        {activeSubTab === 'history' && (
          <History telemetry={telemetry} selectedDevice={selectedDevice} />
        )}
        {activeSubTab === 'reports' && (
          <Reports telemetry={telemetry} selectedDevice={selectedDevice} />
        )}
        {activeSubTab === 'incidents' && (
          <PowerEventInvestigator selectedDevice={selectedDevice} />
        )}
      </div>
    </div>
  );
};

export default Insights;
