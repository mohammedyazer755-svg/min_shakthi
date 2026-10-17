import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import type { SystemHealth, SnapshotChannel } from '@minsakthi/contracts';
import { deviceStreamStatus } from '../live/status';

export interface StatusSummaryProps {
  health?: SystemHealth | null;
  channels?: SnapshotChannel[];
  socketConnected?: boolean;
  className?: string;
}

export const StatusSummary: React.FC<StatusSummaryProps> = ({
  health,
  channels = [],
  socketConnected = false,
  className = '',
}) => {
  const stream = deviceStreamStatus(channels,socketConnected,health);
  const getStatusIcon = (isGood: boolean, isDegraded = false) => {
    if (isGood) return <CheckCircle2 className="w-3 h-3 flex-shrink-0" aria-hidden="true" style={{ color: 'var(--dark-status-ok)' }} />;
    if (isDegraded) return <AlertTriangle className="w-3 h-3 flex-shrink-0" aria-hidden="true" style={{ color: 'var(--dark-status-warn)' }} />;
    return <XCircle className="w-3 h-3 flex-shrink-0" aria-hidden="true" style={{ color: 'var(--dark-status-critical)' }} />;
  };

  const layers = [
    {
      name: 'Broker',
      stateText: !health ? 'Unknown' : health.broker === 'connected' ? (health.brokerSubscribed ? 'Subscribed' : 'Connected') : health.broker === 'subscribing' ? 'Subscribing' : 'Disconnected',
      isGood: health?.broker === 'connected' && health.brokerSubscribed,
      isDegraded: !health || (health.broker === 'connected' && !health.brokerSubscribed),
    },
    {
      name: 'Ingest',
      stateText: !health ? 'Unknown' : health.process === 'healthy' ? 'Healthy' : 'Degraded',
      isGood: health?.process === 'healthy',
      isDegraded: !health || health.process === 'degraded',
    },
    {
      name: 'DB',
      stateText: !health ? 'Unknown' : health.database === 'healthy' ? 'OK' : 'Outage',
      isGood: health?.database === 'healthy',
      isDegraded: !health || health.database === 'degraded',
    },
    {
      name: 'ESP',
      stateText: stream.label,
      isGood: stream.tone === 'positive',
      isDegraded: stream.tone !== 'critical' && stream.tone !== 'positive',
    },
  ];

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-3 px-3 py-1.5 rounded-lg text-[10px] ${className}`}
      role="status"
      aria-label="System Health Status Summary"
      style={{
        background: 'var(--dark-surface)',
        border: '1px solid var(--dark-border)',
      }}
    >
      {layers.map((layer) => (
        <div key={layer.name} className="inline-flex items-center gap-1">
          {layer.stateText === 'Reconnecting' || layer.stateText === 'Subscribing' ? (
            <RefreshCw className="w-3 h-3 animate-spin flex-shrink-0" aria-hidden="true" style={{ color: 'var(--dark-status-warn)' }} />
          ) : (
            getStatusIcon(layer.isGood, layer.isDegraded)
          )}
          <span className="font-bold uppercase tracking-wide" style={{ color: 'var(--dark-text-muted)' }}>{layer.name}</span>
          <span className="font-medium" style={{ color: 'var(--dark-text-primary)' }}>{layer.stateText}</span>
        </div>
      ))}
      {health && health.persistenceLagMs > 1000 && (
        <div className="inline-flex items-center gap-1 font-bold" style={{ color: 'var(--dark-status-warn)' }}>
          <AlertTriangle className="w-3 h-3" aria-hidden="true" />
          <span>Lag: {Math.round(health.persistenceLagMs / 1000)}s</span>
        </div>
      )}
    </div>
  );
};
