import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  style,
  ...rest
}) => {
  const sizeStyle = {
    sm: { minHeight: '36px', padding: '4px 12px', fontSize: '12px' },
    md: { minHeight: '44px', padding: '8px 16px', fontSize: '14px' },
    lg: { minHeight: '48px', padding: '10px 24px', fontSize: '16px' },
  }[size];

  const variantStyle: React.CSSProperties = {
    primary: {
      background: 'var(--button-primary)',
      color: 'var(--button-text)',
      border: 'none',
    },
    secondary: {
      background: 'var(--surface)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-strong)',
    },
    danger: {
      background: 'var(--danger-bg)',
      color: 'var(--status-critical)',
      border: '1px solid var(--danger-border)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border)',
    },
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center font-semibold rounded-lg motion-interactive motion-btn-press select-none relative overflow-hidden
        disabled:opacity-40 disabled:pointer-events-none
        focus-visible:outline-2 focus-visible:outline-offset-2
        ${className}`}
      disabled={disabled || isLoading}
      style={{
        ...sizeStyle,
        ...variantStyle,
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        ...style,
      }}
      {...rest}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <svg
            className="animate-spin h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};
