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
      className={`inline-flex rounded-control border border-border bg-canvas p-0.5 ${className}`}
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
            className={`px-3 py-1.5 text-xs font-semibold rounded-[6px] transition-all focus:outline-none focus:ring-2 focus:ring-brand-gold ${
              isSelected
                ? 'bg-surface text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
