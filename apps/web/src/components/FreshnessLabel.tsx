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
          icon: <CheckCircle2 className="w-3 h-3" aria-hidden="true" style={{ color: 'var(--dark-status-ok)' }} />,
          label: 'Fresh',
          style: {
            color: 'var(--dark-status-ok)',
            background: 'rgba(34,212,124,0.1)',
            border: '1px solid rgba(34,212,124,0.25)',
          },
        };
      case 'stale':
        return {
          icon: <Clock className="w-3 h-3" aria-hidden="true" style={{ color: 'var(--dark-status-warn)' }} />,
          label: 'Stale',
          style: {
            color: 'var(--dark-status-warn)',
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.25)',
          },
        };
      case 'offline_inferred':
        return {
          icon: <AlertOctagon className="w-3 h-3" aria-hidden="true" style={{ color: 'var(--dark-status-critical)' }} />,
          label: 'Offline',
          style: {
            color: 'var(--dark-status-critical)',
            background: 'rgba(245,101,101,0.1)',
            border: '1px solid rgba(245,101,101,0.25)',
          },
        };
      case 'unseen':
        return {
          icon: <HelpCircle className="w-3 h-3" aria-hidden="true" style={{ color: 'var(--dark-text-dim)' }} />,
          label: 'Awaiting',
          style: {
            color: 'var(--dark-text-dim)',
            background: 'rgba(85,85,95,0.15)',
            border: '1px solid var(--dark-border)',
          },
        };
      case 'unconfigured':
      default:
        return {
          icon: <HelpCircle className="w-3 h-3" aria-hidden="true" style={{ color: 'var(--dark-text-dim)' }} />,
          label: 'Not configured',
          style: {
            color: 'var(--dark-text-dim)',
            background: 'rgba(85,85,95,0.15)',
            border: '1px solid var(--dark-border)',
          },
        };
    }
  };

  const { icon, label, style } = getDisplay();

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded ${className}`}
      style={style}
      title={lastReceivedAt ? `Last received at: ${new Date(lastReceivedAt).toLocaleTimeString()}` : undefined}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
};
