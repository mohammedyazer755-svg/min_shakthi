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
        background: 'var(--dark-canvas, #050507)',
        border: '1px solid var(--dark-border)',
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
              background: isSelected ? 'var(--dark-surface)' : 'transparent',
              color: isSelected ? 'var(--dark-accent)' : 'var(--dark-text-muted)',
              border: isSelected ? '1px solid rgba(200,169,110,0.3)' : '1px solid transparent',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
