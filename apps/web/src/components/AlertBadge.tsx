import React from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface AlertBadgeProps {
  severity: AlertSeverity;
  count?: number;
  className?: string;
}

export const AlertBadge: React.FC<AlertBadgeProps> = ({
  severity,
  count,
  className = '',
}) => {
  const config = {
    critical: {
      icon: <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" style={{ color: 'var(--status-critical, #A52E2E)' }} />,
      label: 'Critical',
      style: {
        color: 'var(--status-critical, #A52E2E)',
        background: 'rgba(165, 46, 46, 0.12)',
        border: '1px solid rgba(165, 46, 46, 0.28)',
      },
    },
    warning: {
      icon: <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" style={{ color: 'var(--status-warn, #805300)' }} />,
      label: 'Warning',
      style: {
        color: 'var(--status-warn, #805300)',
        background: 'rgba(128, 83, 0, 0.12)',
        border: '1px solid rgba(128, 83, 0, 0.28)',
      },
    },
    info: {
      icon: <Info className="w-3.5 h-3.5" aria-hidden="true" style={{ color: 'var(--accent-text, #725719)' }} />,
      label: 'Info',
      style: {
        color: 'var(--accent-text, #725719)',
        background: 'var(--accent-dim)',
        border: '1px solid var(--border)',
      },
    },
  }[severity];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded ${className}`}
      style={config.style}
      role="status"
    >
      {config.icon}
      <span>{config.label}</span>
      {count !== undefined && (
        <span className="font-bold tabular-nums ml-1">({count})</span>
      )}
    </span>
  );
};
