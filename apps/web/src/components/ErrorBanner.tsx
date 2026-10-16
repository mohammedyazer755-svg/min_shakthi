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
      className={`p-4 bg-rose-50 border border-rose-200 rounded-control flex items-start space-x-3 text-status-critical ${className}`}
    >
      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-sm mt-0.5 text-text-primary/90">{message}</p>
        {actionText && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-2 text-xs font-semibold underline hover:no-underline text-status-critical focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-status-critical"
          >
            {actionText}
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-text-secondary hover:text-text-primary p-1 rounded focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-gold"
          aria-label="Dismiss error banner"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
