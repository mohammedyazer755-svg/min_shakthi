import type { SnapshotChannel, SystemHealth } from '@minsakthi/contracts';

export function deviceStreamStatus(channels: SnapshotChannel[], socketConnected: boolean, health?: SystemHealth | null) {
  if (!socketConnected) return { label:'Connection lost',tone:'warning' } as const;
  if (!health) return { label:'Checking',tone:'unknown' } as const;
  if (health.broker !== 'connected' || !health.brokerSubscribed || health.database !== 'healthy' || health.process !== 'healthy') {
    return { label:'Connection interrupted',tone:'warning' } as const;
  }
  const configured = channels.filter((ch) => ch.freshness !== 'unconfigured');
  if (!configured.length) return { label:'Not configured',tone:'unknown' } as const;
  const fresh = configured.filter((ch) => ch.freshness === 'fresh' && ch.lastSample && !ch.lastSample.retained);
  if (fresh.length) return { label:fresh.length === configured.length ? 'Live' : 'Live · Partial',tone:'positive' } as const;
  if (configured.some((ch) => ch.freshness === 'stale')) return { label:'No recent data',tone:'warning' } as const;
  if (configured.some((ch) => ch.freshness === 'offline_inferred')) return { label:'Offline (inferred)',tone:'critical' } as const;
  return { label:'Waiting for ESP',tone:'unknown' } as const;
}
