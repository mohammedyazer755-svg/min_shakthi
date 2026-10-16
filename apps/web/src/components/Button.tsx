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
  ...rest
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-control transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold disabled:opacity-50 disabled:pointer-events-none';

  const sizeClasses = {
    sm: 'min-h-[36px] px-3 py-1 text-xs',
    md: 'min-h-[44px] px-4 py-2 text-sm', // Meets 44px minimum touch target
    lg: 'min-h-[48px] px-6 py-2.5 text-base',
  }[size];

  const variantClasses = {
    primary: 'bg-btn-primary text-white hover:bg-[#343936] active:bg-[#181a19]',
    secondary: 'bg-surface text-text-primary border border-border hover:bg-[#F2F1EC] active:bg-[#EAE8E1]',
    danger: 'bg-status-critical text-white hover:bg-[#8e2626] active:bg-[#721e1e]',
    ghost: 'bg-transparent text-text-primary hover:bg-[#EAE8E1]/50 active:bg-[#EAE8E1]',
  }[variant];

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading ? (
        <span className="inline-flex items-center space-x-2">
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
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
