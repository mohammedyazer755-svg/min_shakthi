import { loadAndValidateServerEnv } from './config/env.js';
import { getTelemetryRepository } from './storage/db.js';
import { PostgresTelemetryRepository } from './storage/postgres.js';
import { DeviceRegistry } from './ingest/registry.js';
import { IngestMetrics } from './observability/metrics.js';
import { MqttIngestService } from './mqtt/client.js';
import { AlertEngine } from './alerts/engine.js';

const env = loadAndValidateServerEnv();
const repository = getTelemetryRepository();
if (!(repository instanceof PostgresTelemetryRepository)) throw new Error('Cloud worker requires Postgres.');
const repo: PostgresTelemetryRepository = repository;
const registry = DeviceRegistry.getInstance();
registry.clear();
const metrics = IngestMetrics.getInstance();
const engines = new Map<string,AlertEngine>();
let stopping = false;
let lastConfigRefresh = 0;

async function refreshConfig() {
  const devices = await repo.listDevices();
  const seen = new Set<string>();
  const configured = await Promise.all(devices.map(async (device) => ({ device,channels:await repo.getDeviceChannels(device.siteId,device.rawDeviceId) })));
  registry.clear();
  for (const {device,channels} of configured) {
    registry.registerDevice({ siteId:device.siteId,rawDeviceId:device.rawDeviceId,sourceNamespace:'default',
      enabled:device.enabled,expectedIntervalMs:device.expectedIntervalMs,configVersion:device.configVersion,
      mappings:channels.map((c) => ({ rawChannelId:c.rawChannelId,displaySlot:c.displaySlot as 1|2|3|4|5|null,label:c.label,enabled:c.enabled })) });
    seen.add(device.siteId);
  }
  for (const siteId of seen) {
    const rules = await repo.getAlertRules(siteId);
    let engine = engines.get(siteId);
    if (!engine) { engine = new AlertEngine(); engines.set(siteId,engine); }
    for (const old of engine.getRules()) if (!rules.some((r) => r.id === old.id)) engine.deleteRule(old.id);
    for (const rule of rules) engine.updateRule(rule);
  }
}

await refreshConfig();
const mqtt = new MqttIngestService(env,{
  persistentSession:true,
  persist:async (sample) => {
    // MQTT QoS1 PUBACK is sent only after this transaction commits.
    await repo.insertTelemetryBatch([sample]);
    for (const alert of engines.get(sample.siteId)?.evaluateSample(sample,!sample.retained) ?? []) {
      await repo.saveAlert(alert);
    }
  },
});

async function heartbeat() {
  if (stopping) return;
  try {
    if (Date.now() - lastConfigRefresh >= 5000) {
      await refreshConfig();
      lastConfigRefresh = Date.now();
    }
    await repo.saveWorkerStatus({ at:new Date().toISOString(),epoch:mqtt.getEpoch(),connected:metrics.brokerConnected,
      subscribed:metrics.brokerSubscribed,received:metrics.receivedCount,accepted:metrics.totalAccepted,quarantined:metrics.totalQuarantined });
  } catch { console.error('[MQTT WORKER] Database/configuration update unavailable.'); }
  if (!stopping) setTimeout(() => { void heartbeat(); },2000);
}
void heartbeat();
void mqtt.start();
console.log('[MQTT WORKER] Starting registered-device subscription.');

async function shutdown() {
  if (stopping) return;
  stopping = true;
  await mqtt.stop();
  await repo.close();
  process.exit(0);
}
process.on('SIGTERM',() => { void shutdown(); });
process.on('SIGINT',() => { void shutdown(); });
