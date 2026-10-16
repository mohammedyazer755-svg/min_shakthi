import React from 'react';
import { Card } from './Card';

export interface MetricCardProps {
  label: string;
  value: number | string | null;
  unit?: string;
  subtext?: string;
  testOnly?: boolean;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  subtext,
  testOnly = false,
  className = '',
}) => {
  const displayValue = value === null || value === undefined ? '—' : value.toString();

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      {testOnly && (
        <span
          className="absolute top-2 right-2 text-[10px] font-semibold tracking-wider text-brand-gold-text bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded"
          aria-label="Test Only Data Marker"
        >
          TEST ONLY
        </span>
      )}
      <div className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="flex items-baseline space-x-1.5">
        <span
          className="text-2xl sm:text-3xl font-semibold text-text-primary tabular-nums tracking-tight"
          aria-label={`${label}: ${displayValue} ${unit ?? ''}`}
        >
          {displayValue}
        </span>
        {unit && (
          <span className="text-sm font-medium text-text-secondary select-none">
            {unit}
          </span>
        )}
      </div>
      {subtext && (
        <div className="mt-1 text-xs text-text-secondary">
          {subtext}
        </div>
      )}
    </Card>
  );
};
