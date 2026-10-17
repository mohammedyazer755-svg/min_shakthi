import React from 'react';

export type TimeRange = '15m' | '1h' | '6h' | '24h';

export interface TimeRangePickerProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  className?: string;
}

export const TimeRangePicker: React.FC<TimeRangePickerProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const options: Array<{ id: TimeRange; label: string }> = [
    { id: '15m', label: '15m' },
    { id: '1h', label: '1h' },
    { id: '6h', label: '6h' },
    { id: '24h', label: '24h' },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Select historical time range"
      className={`inline-flex rounded-lg p-0.5 ${className}`}
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border)',
      }}
    >
      {options.map((opt) => {
        const isSelected = value === opt.id;
        return (
          <button
            key={opt.id}
            role="radio"
            aria-checked={isSelected}
            type="button"
            onClick={() => onChange(opt.id)}
            className="px-3 py-1.5 text-xs font-bold rounded-md transition-all focus:outline-none"
            style={{
              background: isSelected ? 'var(--surface)' : 'transparent',
              color: isSelected ? 'var(--accent-text)' : 'var(--text-secondary)',
              border: isSelected ? '1px solid var(--border-strong)' : '1px solid transparent',
              boxShadow: isSelected ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
