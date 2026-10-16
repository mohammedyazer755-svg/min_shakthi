import React from 'react';
import { CheckCircle2, Clock, HelpCircle, AlertOctagon } from 'lucide-react';
import type { ChannelFreshness } from '@minsakthi/contracts';

export interface FreshnessLabelProps {
  freshness: ChannelFreshness;
  lastReceivedAt?: string | null;
  className?: string;
}

export const FreshnessLabel: React.FC<FreshnessLabelProps> = ({
  freshness,
  lastReceivedAt,
  className = '',
}) => {
  const getDisplay = () => {
    switch (freshness) {
      case 'fresh':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-status-positive" aria-hidden="true" />,
          label: 'Fresh',
          containerClasses: 'text-status-positive bg-emerald-50 border-emerald-200',
        };
      case 'stale':
        return {
          icon: <Clock className="w-3.5 h-3.5 text-status-warning" aria-hidden="true" />,
          label: 'Stale',
          containerClasses: 'text-status-warning bg-amber-50 border-amber-200',
        };
      case 'offline_inferred':
        return {
          icon: <AlertOctagon className="w-3.5 h-3.5 text-status-critical" aria-hidden="true" />,
          label: 'Offline (inferred)',
          containerClasses: 'text-status-critical bg-rose-50 border-rose-200',
        };
      case 'unseen':
        return {
          icon: <HelpCircle className="w-3.5 h-3.5 text-text-secondary" aria-hidden="true" />,
          label: 'Awaiting first packet',
          containerClasses: 'text-text-secondary bg-[#F2F1EC] border-border',
        };
      case 'unconfigured':
      default:
        return {
          icon: <HelpCircle className="w-3.5 h-3.5 text-text-secondary" aria-hidden="true" />,
          label: 'Not configured',
          containerClasses: 'text-text-secondary bg-[#F2F1EC] border-border',
        };
    }
  };

  const { icon, label, containerClasses } = getDisplay();

  return (
    <span
      className={`inline-flex items-center space-x-1.5 px-2 py-0.5 text-xs font-medium border rounded-badge ${containerClasses} ${className}`}
      title={lastReceivedAt ? `Last received at: ${new Date(lastReceivedAt).toLocaleTimeString()}` : undefined}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
};
