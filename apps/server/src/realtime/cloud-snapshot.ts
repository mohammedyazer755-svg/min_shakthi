import crypto from 'node:crypto';
import { readingFreshness, type SnapshotChannel, type SnapshotPayload } from '@minsakthi/contracts';
import type { PostgresTelemetryRepository } from '../storage/postgres.js';

export async function cloudSnapshot(repo: PostgresTelemetryRepository,requestId: string,generation: number,siteId: string,deviceId: string): Promise<SnapshotPayload> {
  const [device,mappings,latest,worker] = await Promise.all([
    repo.getDevice(siteId,deviceId),repo.getDeviceChannels(siteId,deviceId),repo.getLatestTelemetry(siteId,deviceId),repo.getWorkerStatus(),
  ]);
  if (!device || !device.enabled) throw new Error('DEVICE_NOT_FOUND');
  const now = Date.now();
  const active = !!worker && now-new Date(worker.at).getTime()<10000;
  const channels: SnapshotChannel[] = [];
  for (let slot=1;slot<=5;slot++) {
    const mapping = mappings.find((m) => m.displaySlot === slot && m.enabled);
    const sample = mapping ? latest.get(mapping.rawChannelId) ?? null : null;
    channels.push({ rawChannelId:mapping?.rawChannelId ?? `slot_${slot}`,displaySlot:slot as 1|2|3|4|5,
      label:mapping?.label ?? `Channel ${slot} (Unconfigured)`,lastSample:sample,lastReceivedAt:sample?.receivedAt ?? null,
      freshness:readingFreshness({ receivedAt:sample?.receivedAt ?? null,retained:sample?.retained,
        suspectDuplicate:sample?.quality.includes('SUSPECT_DUPLICATE'),
        configured:!!mapping,expectedIntervalMs:device.expectedIntervalMs,nowMs:now,
        transportAvailable:active && worker!.connected && worker!.subscribed }) });
  }
  const configured = channels.filter((c) => c.freshness !== 'unconfigured').length;
  const reporting = channels.filter((c) => c.freshness === 'fresh').length;
  return { schemaVersion:1,requestId,selectionGeneration:generation,siteId,deviceId,
    serverEpoch:worker?.epoch ?? crypto.randomUUID(),cursor:String(worker?.received ?? 0),serverNow:new Date(now).toISOString(),
    mappingVersion:device.configVersion,expectedIntervalMs:device.expectedIntervalMs,channels,
    health:{ process:active?'healthy':'degraded',broker:active && worker!.connected?'connected':'disconnected',brokerSubscribed:active && worker!.subscribed,
      database:'healthy',persistenceLagMs:0 },coverage:{ configuredSlots:configured,reportingSlots:reporting,partial:reporting<configured } };
}
