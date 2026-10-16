import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import type { SystemHealth } from '@minsakthi/contracts';

export interface StatusSummaryProps {
  health?: SystemHealth;
  socketConnected?: boolean;
  className?: string;
}

export const StatusSummary: React.FC<StatusSummaryProps> = ({
  health = {
    process: 'healthy',
    broker: 'connected',
    brokerSubscribed: true,
    database: 'healthy',
    persistenceLagMs: 0,
  },
  socketConnected = true,
  className = '',
}) => {
  const getStatusIcon = (isGood: boolean, isDegraded = false) => {
    if (isGood) {
      return <CheckCircle2 className="w-4 h-4 text-status-positive flex-shrink-0" aria-hidden="true" />;
    }
    if (isDegraded) {
      return <AlertTriangle className="w-4 h-4 text-status-warning flex-shrink-0" aria-hidden="true" />;
    }
    return <XCircle className="w-4 h-4 text-status-critical flex-shrink-0" aria-hidden="true" />;
  };

  const layers = [
    {
      name: 'Broker',
      stateText: health.broker === 'connected' ? (health.brokerSubscribed ? 'Subscribed' : 'Connected (No SUBACK)') : health.broker === 'subscribing' ? 'Subscribing' : 'Disconnected',
      isGood: health.broker === 'connected' && health.brokerSubscribed,
      isDegraded: health.broker === 'connected' && !health.brokerSubscribed,
    },
    {
      name: 'Ingest',
      stateText: health.process === 'healthy' ? 'Healthy' : 'Degraded',
      isGood: health.process === 'healthy',
      isDegraded: health.process === 'degraded',
    },
    {
      name: 'Database',
      stateText: health.database === 'healthy' ? 'Healthy' : 'Outage / Spooling',
      isGood: health.database === 'healthy',
      isDegraded: health.database === 'degraded',
    },
    {
      name: 'Stream',
      stateText: socketConnected ? 'Connected' : 'Reconnecting',
      isGood: socketConnected,
      isDegraded: false,
    },
  ];

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-3 sm:gap-4 px-3 py-1.5 bg-surface border border-border rounded-control text-xs ${className}`}
      role="status"
      aria-label="System Health Status Summary"
    >
      {layers.map((layer) => (
        <div key={layer.name} className="inline-flex items-center space-x-1.5">
          {layer.stateText === 'Reconnecting' || layer.stateText === 'Subscribing' ? (
            <RefreshCw className="w-3.5 h-3.5 text-status-warning animate-spin flex-shrink-0" aria-hidden="true" />
          ) : (
            getStatusIcon(layer.isGood, layer.isDegraded)
          )}
          <span className="font-medium text-text-primary">{layer.name}:</span>
          <span className="text-text-secondary">{layer.stateText}</span>
        </div>
      ))}
      {health.persistenceLagMs > 1000 && (
        <div className="inline-flex items-center space-x-1 text-status-warning font-medium">
          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Lag: {Math.round(health.persistenceLagMs / 1000)}s</span>
        </div>
      )}
    </div>
  );
};
