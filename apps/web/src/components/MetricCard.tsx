import React from 'react';

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
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: 'var(--dark-surface)',
        border: '1px solid var(--dark-border)',
        borderTop: '2px solid var(--dark-accent)',
        borderRadius: '12px',
        padding: '20px 24px',
      }}
    >
      {testOnly && (
        <span
          className="absolute top-2 right-2 text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded"
          aria-label="Test Only Data Marker"
          style={{
            color: 'var(--dark-accent)',
            background: 'var(--dark-accent-dim)',
            border: '1px solid rgba(200,169,110,0.25)',
          }}
        >
          TEST ONLY
        </span>
      )}
      <div
        className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2"
        style={{ color: 'var(--dark-text-muted)' }}
      >
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className="font-extrabold tabular-nums tracking-tight metric-glow"
          style={{
            fontSize: '1.75rem',
            color: 'var(--dark-text-primary)',
          }}
          aria-label={`${label}: ${displayValue} ${unit ?? ''}`}
        >
          {displayValue}
        </span>
        {unit && (
          <span
            className="text-sm font-semibold select-none"
            style={{ color: 'var(--dark-text-muted)' }}
          >
            {unit}
          </span>
        )}
      </div>
      {subtext && (
        <div
          className="mt-1 text-[11px]"
          style={{ color: 'var(--dark-text-dim)' }}
        >
          {subtext}
        </div>
      )}
    </div>
  );
};
