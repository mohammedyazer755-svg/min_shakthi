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
      icon: <AlertCircle className="w-3.5 h-3.5 text-status-critical" aria-hidden="true" />,
      label: 'Critical',
      classes: 'text-status-critical bg-rose-50 border-rose-200',
    },
    warning: {
      icon: <AlertTriangle className="w-3.5 h-3.5 text-status-warning" aria-hidden="true" />,
      label: 'Warning',
      classes: 'text-status-warning bg-amber-50 border-amber-200',
    },
    info: {
      icon: <Info className="w-3.5 h-3.5 text-brand-gold-text" aria-hidden="true" />,
      label: 'Info',
      classes: 'text-brand-gold-text bg-amber-50/50 border-amber-200',
    },
  }[severity];

  return (
    <span
      className={`inline-flex items-center space-x-1.5 px-2 py-0.5 text-xs font-medium border rounded-badge ${config.classes} ${className}`}
      role="status"
    >
      {config.icon}
      <span>{config.label}</span>
      {count !== undefined && (
        <span className="font-semibold tabular-nums ml-1">({count})</span>
      )}
    </span>
  );
};
