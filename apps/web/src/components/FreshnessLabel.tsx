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
          icon: <CheckCircle2 className="w-3 h-3" aria-hidden="true" style={{ color: 'var(--status-ok)' }} />,
          label: 'Fresh',
          style: {
            color: 'var(--status-ok)',
            background: 'var(--status-ok-bg)',
            border: '1px solid var(--status-ok-border)',
          },
        };
      case 'stale':
        return {
          icon: <Clock className="w-3 h-3" aria-hidden="true" style={{ color: 'var(--status-warn)' }} />,
          label: 'Stale',
          style: {
            color: 'var(--status-warn)',
            background: 'var(--status-warn-bg)',
            border: '1px solid var(--status-warn-border)',
          },
        };
      case 'offline_inferred':
        return {
          icon: <AlertOctagon className="w-3 h-3" aria-hidden="true" style={{ color: 'var(--status-critical)' }} />,
          label: 'Offline',
          style: {
            color: 'var(--status-critical)',
            background: 'var(--status-critical-bg)',
            border: '1px solid var(--status-critical-border)',
          },
        };
      case 'unseen':
        return {
          icon: <HelpCircle className="w-3 h-3" aria-hidden="true" style={{ color: 'var(--status-unknown)' }} />,
          label: 'Awaiting',
          style: {
            color: 'var(--status-unknown)',
            background: 'var(--status-unknown-bg)',
            border: '1px solid var(--status-unknown-border)',
          },
        };
      case 'unconfigured':
      default:
        return {
          icon: <HelpCircle className="w-3 h-3" aria-hidden="true" style={{ color: 'var(--status-unknown)' }} />,
          label: 'Not configured',
          style: {
            color: 'var(--status-unknown)',
            background: 'var(--status-unknown-bg)',
            border: '1px solid var(--status-unknown-border)',
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
