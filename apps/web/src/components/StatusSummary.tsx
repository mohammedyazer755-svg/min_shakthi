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
    if (isGood) return <CheckCircle2 className="w-3 h-3 flex-shrink-0" aria-hidden="true" style={{ color: 'var(--status-ok)' }} />;
    if (isDegraded) return <AlertTriangle className="w-3 h-3 flex-shrink-0" aria-hidden="true" style={{ color: 'var(--status-warn)' }} />;
    return <XCircle className="w-3 h-3 flex-shrink-0" aria-hidden="true" style={{ color: 'var(--status-critical)' }} />;
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
      className={`inline-flex flex-wrap items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] ${className}`}
      role="status"
      aria-label="System Health Status Summary"
      style={{
        background: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(0, 0, 0, 0.07)',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
      }}
    >
      {layers.map((layer) => (
        <div key={layer.name} className="workspace-health-layer inline-flex items-center gap-1" data-tone={layer.isGood ? 'positive' : layer.isDegraded ? 'warning' : 'critical'}>
          {layer.stateText === 'Reconnecting' || layer.stateText === 'Subscribing' ? (
            <RefreshCw className="w-3 h-3 animate-spin flex-shrink-0" aria-hidden="true" style={{ color: 'var(--status-warn)' }} />
          ) : (
            getStatusIcon(layer.isGood, layer.isDegraded)
          )}
          <span className="font-extrabold uppercase tracking-wide text-[9px]" style={{ color: 'var(--text-secondary)' }}>{layer.name}</span>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{layer.stateText}</span>
        </div>
      ))}
      {health && health.persistenceLagMs > 1000 && (
        <div className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full" style={{ color: 'var(--status-warn)', background: 'rgba(245, 158, 11, 0.1)' }}>
          <AlertTriangle className="w-3 h-3" aria-hidden="true" />
          <span>Lag: {Math.round(health.persistenceLagMs / 1000)}s</span>
        </div>
      )}
    </div>
  );
};
