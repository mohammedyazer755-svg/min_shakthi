import React, { useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, disabled, className = '', style, ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
          style={{ color: 'var(--dark-text-muted)' }}
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`w-full min-h-[44px] px-3.5 py-2 text-sm font-medium rounded-lg transition-all
            placeholder:text-[rgba(138,138,150,0.5)]
            disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none
            ${className}`}
          style={{
            background: 'var(--dark-canvas)',
            border: `1px solid ${error ? 'var(--dark-status-critical)' : 'var(--dark-border-strong)'}`,
            color: 'var(--dark-text-primary)',
            ...style,
          }}
          onFocus={(e) => {
            if (!error) e.currentTarget.style.borderColor = 'var(--dark-accent)';
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            if (!error) e.currentTarget.style.borderColor = 'var(--dark-border-strong)';
            rest.onBlur?.(e);
          }}
          {...rest}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-xs font-medium" style={{ color: 'var(--dark-status-critical)' }}>
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="mt-1.5 text-xs" style={{ color: 'var(--dark-text-muted)' }}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
