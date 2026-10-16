import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export interface ErrorBannerProps {
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  title,
  message,
  actionText,
  onAction,
  onDismiss,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`p-4 rounded-lg flex items-start gap-3 ${className}`}
      style={{
        background: 'rgba(245, 101, 101, 0.08)',
        border: '1px solid rgba(245, 101, 101, 0.28)',
        color: '#f87171',
      }}
    >
      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold tracking-tight text-white">{title}</h4>
        <p className="text-xs mt-0.5" style={{ color: 'var(--dark-text-muted, #8a8a96)' }}>{message}</p>
        {actionText && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-2 text-xs font-semibold underline hover:no-underline text-red-400"
          >
            {actionText}
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded text-neutral-400 hover:text-white"
          aria-label="Dismiss error banner"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
