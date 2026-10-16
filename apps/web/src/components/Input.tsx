import React, { useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, disabled, className = '', ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`w-full min-h-[44px] px-3.5 py-2 text-sm bg-surface text-text-primary border rounded-control transition-colors placeholder:text-text-secondary/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold disabled:bg-[#F2F1EC] disabled:cursor-not-allowed ${
            error
              ? 'border-status-critical focus:border-status-critical'
              : 'border-border-strong hover:border-text-primary focus:border-text-primary'
          } ${className}`}
          {...rest}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-xs text-status-critical font-medium">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="mt-1.5 text-xs text-text-secondary">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
