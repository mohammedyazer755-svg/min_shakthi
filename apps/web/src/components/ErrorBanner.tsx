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
      className={`motion-feedback p-4 rounded-lg flex items-start gap-3 ${className}`}
      style={{
        background: 'rgba(165, 46, 46, 0.08)',
        border: '1px solid rgba(165, 46, 46, 0.28)',
        color: 'var(--status-critical, #A52E2E)',
      }}
    >
      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold tracking-tight" style={{ color: 'var(--status-critical, #A52E2E)' }}>{title}</h4>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{message}</p>
        {actionText && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-2 text-xs font-semibold underline hover:no-underline"
            style={{ color: 'var(--status-critical, #A52E2E)' }}
          >
            {actionText}
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss error banner"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
