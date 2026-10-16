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
      icon: <AlertCircle className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />,
      label: 'Critical',
      style: {
        color: '#f87171',
        background: 'rgba(245, 101, 101, 0.12)',
        border: '1px solid rgba(245, 101, 101, 0.28)',
      },
    },
    warning: {
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />,
      label: 'Warning',
      style: {
        color: '#fbbf24',
        background: 'rgba(245, 158, 11, 0.12)',
        border: '1px solid rgba(245, 158, 11, 0.28)',
      },
    },
    info: {
      icon: <Info className="w-3.5 h-3.5" aria-hidden="true" style={{ color: 'var(--dark-accent)' }} />,
      label: 'Info',
      style: {
        color: 'var(--dark-accent)',
        background: 'rgba(200, 169, 110, 0.12)',
        border: '1px solid rgba(200, 169, 110, 0.28)',
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
