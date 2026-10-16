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
      <div className="w-12 h-12 rounded-full bg-[#F2F1EC] text-text-secondary flex items-center justify-center mb-4">
        {icon ?? <Inbox className="w-6 h-6" aria-hidden="true" />}
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1">
        {title}
      </h3>
      <p className="text-sm text-text-secondary max-w-sm mb-5">
        {description}
      </p>
      {action && <div>{action}</div>}
    </Card>
  );
};
