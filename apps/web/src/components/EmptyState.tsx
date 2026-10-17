import React from 'react';
import { Inbox } from 'lucide-react';
import { Card } from './Card';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = '',
}) => {
  return (
    <Card className={`text-center py-12 px-6 flex flex-col items-center justify-center ${className}`}>
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
        style={{
          background: 'var(--canvas)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
        }}
      >
        {icon ?? <Inbox className="w-6 h-6" aria-hidden="true" />}
      </div>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p className="text-sm max-w-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
        {description}
      </p>
      {action && <div>{action}</div>}
    </Card>
  );
};
