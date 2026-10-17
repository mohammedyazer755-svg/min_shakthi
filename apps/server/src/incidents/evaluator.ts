import crypto from 'node:crypto';
import type {
  TelemetryPayload,
  AlertRule,
  IncidentRecord,
  IncidentSamplePoint,
  IncidentExtrema,
} from '@minsakthi/contracts';
import { freshnessWindows } from '@minsakthi/contracts';
import { type ITelemetryRepository, getTelemetryRepository } from '../storage/db.js';
import { IngestMetrics } from '../observability/metrics.js';

export interface EvaluatorOptions {
  windowBeforeMs?: number; // Default 120,000 (2 minutes)
  windowAfterMs?: number;  // Default 120,000 (2 minutes)
  cooldownMs?: number;     // Cooldown for grouping flapping events (Default 60,000 ms)
}

export class IncidentEvaluator {
  private repo: ITelemetryRepository;
  private metrics: IngestMetrics;
  private windowBeforeMs: number;
  private windowAfterMs: number;
  private cooldownMs: number;

  // Track active/evaluating incidents: key = `${siteId}:${deviceId}:${type}:${channelId ?? 'all'}`
  private activeIncidents = new Map<string, IncidentRecord>();
  // Cooldown tracker for recently resolved incidents: key -> { incidentId, resolvedAtMs }
  private cooldownMap = new Map<string, { incidentId: string; resolvedAtMs: number }>();
  // Device last received timestamp: deviceId -> lastReceivedMs
  private deviceLastSeen = new Map<string, { receivedAtMs: number; receivedAtIso: string }>();

  private isInitialized = false;

  constructor(repo?: ITelemetryRepository, options: EvaluatorOptions = {}) {
    this.repo = repo ?? getTelemetryRepository();
    this.metrics = IngestMetrics.getInstance();
    this.windowBeforeMs = options.windowBeforeMs ?? 120000;
    this.windowAfterMs = options.windowAfterMs ?? 120000;
    this.cooldownMs = options.cooldownMs ?? 60000;
  }

  /**
   * Initializes evaluator from repository, recovering active incidents across restarts.
   */
  public async initialize(workerDowntime?: { startAt: string; endAt: string }): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Find all registered devices and populate active incidents
      const devices = await this.repo.listDevices();
      const seenSites = new Set<string>();
      for (const d of devices) {
        seenSites.add(d.siteId);
      }

      for (const siteId of seenSites) {
        const active = await this.repo.getActiveIncidents(siteId);
        for (const inc of active) {
          const key = this.buildKey(inc.siteId, inc.deviceId, inc.type, inc.channelId);
          this.activeIncidents.set(key, inc);

          // If worker downtime occurred, record it in the incident evidence
          if (workerDowntime) {
            const startMs = new Date(workerDowntime.startAt).getTime();
            const endMs = new Date(workerDowntime.endAt).getTime();
            inc.evidence.gaps.push({
              startAt: workerDowntime.startAt,
              endAt: workerDowntime.endAt,
              durationMs: Math.max(0, endMs - startMs),
              reason: 'Worker restart observation gap',
            });
            inc.evidence.transportHealth = {
              brokerConnected: this.metrics.brokerConnected,
              brokerSubscribed: this.metrics.brokerSubscribed,
            };
            await this.repo.saveIncident(inc);
          }
        }
      }
    } catch (err) {
      console.warn('[INCIDENT EVALUATOR] Initialization warning:', (err as Error).message);
    }

    this.isInitialized = true;
  }

  private buildKey(siteId: string, deviceId: string, type: string, channelId: string | null): string {
    return `${siteId}:${deviceId}:${type}:${channelId ?? 'all'}`;
  }

  /**
   * Evaluates an incoming telemetry sample against electrical alert rules and checks for recovery.
   */
  public async processTelemetrySample(sample: TelemetryPayload, activeRules: AlertRule[]): Promise<void> {
    const sampleTimeMs = new Date(sample.receivedAt).getTime();
    this.deviceLastSeen.set(sample.deviceId, {
      receivedAtMs: sampleTimeMs,
      receivedAtIso: sample.receivedAt,
    });

    // 1. Check recovery of any active device_interruption for this device
    await this.checkDeviceInterruptionRecovery(sample);

    // 2. Evaluate electrical breaches for this sample
    await this.evaluateElectricalBreaches(sample, activeRules);

    // 3. Collect sample points for any ongoing incidents matching this device
    this.appendSampleToActiveIncidents(sample);
  }

  /**
   * Check if an active device interruption should begin recovery window upon receiving new valid sample.
   */
  private async checkDeviceInterruptionRecovery(sample: TelemetryPayload): Promise<void> {
    const key = this.buildKey(sample.siteId, sample.deviceId, 'device_interruption', null);
    const incident = this.activeIncidents.get(key);
    if (!incident) return;

    // Retained messages or broken transport do not prove live return
    if (sample.retained) return;

    if (!incident.evidence.recoveryTime) {
      incident.evidence.recoveryTime = sample.receivedAt;
      incident.endedAt = sample.receivedAt;
      const startMs = new Date(incident.startedAt).getTime();
      const endMs = new Date(sample.receivedAt).getTime();
      incident.durationMs = Math.max(0, Math.round((endMs - startMs) / 1000));

      // Close the open silence gap
      const lastGap = incident.evidence.gaps[incident.evidence.gaps.length - 1];
      if (lastGap && !lastGap.endAt) {
        lastGap.endAt = sample.receivedAt;
        const gapStartMs = new Date(lastGap.startAt).getTime();
        lastGap.durationMs = Math.max(0, endMs - gapStartMs);
      }

      incident.summary = this.generateSummary(incident);
      await this.repo.saveIncident(incident);
    } else {
      // Check if after-window has completed
      const recoveryMs = new Date(incident.evidence.recoveryTime).getTime();
      const currentMs = new Date(sample.receivedAt).getTime();
      if (currentMs - recoveryMs >= incident.evidence.windowAfterMs) {
        incident.state = 'resolved';
        incident.summary = this.generateSummary(incident);
        await this.repo.saveIncident(incident);
        this.activeIncidents.delete(key);
        this.cooldownMap.set(key, { incidentId: incident.id, resolvedAtMs: currentMs });
      }
    }
  }

  /**
   * Evaluate electrical threshold breaches from sample and active rules.
   */
  private async evaluateElectricalBreaches(sample: TelemetryPayload, rules: AlertRule[]): Promise<void> {
    const sampleTimeMs = new Date(sample.receivedAt).getTime();

    for (const rule of rules) {
      if (!rule.enabled || rule.deviceId !== sample.deviceId) continue;
      if (rule.channelId && rule.channelId !== sample.channelId) continue;

      let val: number | null = null;
      if (rule.metric === 'voltage') val = sample.values.voltage;
      else if (rule.metric === 'current') val = sample.values.current;
      else if (rule.metric === 'power') val = sample.values.power;
      else if (rule.metric === 'frequency') val = sample.values.frequency;

      if (val === null || Number.isNaN(val)) continue;

      const isViolating = this.checkViolation(val, rule.operator, rule.threshold);
      const key = this.buildKey(sample.siteId, sample.deviceId, 'electrical_breach', rule.channelId ?? sample.channelId);

      let incident = this.activeIncidents.get(key);

      if (isViolating) {
        if (!incident) {
          // Check cooldown for flapping deduplication
          const cooldown = this.cooldownMap.get(key);
          if (cooldown && sampleTimeMs - cooldown.resolvedAtMs < this.cooldownMs) {
            // Reopen existing incident from cooldown instead of creating duplicate card
            const prev = await this.repo.getIncidentById(sample.siteId, cooldown.incidentId);
            if (prev) {
              incident = prev;
              incident.state = 'evaluating';
              incident.evidence.recoveryTime = null;
              incident.endedAt = null;
              incident.evidence.gaps.push({
                startAt: prev.endedAt ?? sample.receivedAt,
                endAt: sample.receivedAt,
                durationMs: sampleTimeMs - (prev.endedAt ? new Date(prev.endedAt).getTime() : sampleTimeMs),
                reason: 'Flapping re-occurrence within cooldown',
              });
              this.activeIncidents.set(key, incident);
            }
          }

          if (!incident) {
            // Create new electrical breach incident
            incident = await this.createElectricalIncident(sample, rule, val);
            this.activeIncidents.set(key, incident);
          }
        }

        // Update extrema during breach
        this.updateExtrema(incident.evidence.extrema, sample.values);
        incident.evidence.lastReceivedAt = sample.receivedAt;
        await this.repo.saveIncident(incident);
      } else {
        // Not violating: check hysteresis for resolution
        if (incident && !incident.evidence.recoveryTime) {
          const isCleared = this.checkHysteresisClear(val, rule.operator, rule.threshold, rule.hysteresis);
          if (isCleared) {
            incident.evidence.recoveryTime = sample.receivedAt;
            incident.endedAt = sample.receivedAt;
            const startMs = new Date(incident.startedAt).getTime();
            const endMs = sampleTimeMs;
            incident.durationMs = Math.max(0, Math.round((endMs - startMs) / 1000));
            incident.summary = this.generateSummary(incident);
            await this.repo.saveIncident(incident);
          }
        } else if (incident && incident.evidence.recoveryTime) {
          // Check if post-incident after-window has completed
          const recoveryMs = new Date(incident.evidence.recoveryTime).getTime();
          if (sampleTimeMs - recoveryMs >= incident.evidence.windowAfterMs) {
            incident.state = 'resolved';
            incident.summary = this.generateSummary(incident);
            await this.repo.saveIncident(incident);
            this.activeIncidents.delete(key);
            this.cooldownMap.set(key, { incidentId: incident.id, resolvedAtMs: sampleTimeMs });
          }
        }
      }
    }
  }

  /**
   * Periodic cadence check: detects device silence or transport interruptions when browsers are closed.
   */
  public async checkCadence(nowMs: number = Date.now()): Promise<void> {
    const devices = await this.repo.listDevices();
    const transportHealthy = this.metrics.brokerConnected && this.metrics.brokerSubscribed;

    for (const dev of devices) {
      if (!dev.enabled) continue;

      const last = this.deviceLastSeen.get(dev.rawDeviceId);
      const expectedInterval = dev.expectedIntervalMs || 5000;
      const windows = freshnessWindows(expectedInterval);

      // If we haven't seen any packet in this process, skip or use initial time
      if (!last) continue;

      const ageMs = nowMs - last.receivedAtMs;
      const key = this.buildKey(dev.siteId, dev.rawDeviceId, 'device_interruption', null);
      let incident = this.activeIncidents.get(key);

      if (ageMs >= windows.offlineAfterMs) {
        if (!transportHealthy) {
          // Transport outage detected! Worker/broker is down.
          const transportKey = this.buildKey(dev.siteId, dev.rawDeviceId, 'transport_outage', null);
          let transportInc = this.activeIncidents.get(transportKey);
          if (!transportInc) {
            transportInc = {
              id: crypto.randomUUID(),
              siteId: dev.siteId,
              deviceId: dev.rawDeviceId,
              channelId: null,
              type: 'transport_outage',
              severity: 'warning',
              state: 'evaluating',
              title: `Monitoring Transport Interrupted (${dev.rawDeviceId})`,
              summary: `Broker or worker transport disconnected for ${Math.round(ageMs / 1000)}s. Device power state unconfirmed during observation gap.`,
              causeConfirmation: 'transport_interruption',
              startedAt: new Date(last.receivedAtMs + windows.staleAfterMs).toISOString(),
              endedAt: null,
              durationMs: Math.round(ageMs / 1000),
              evidence: {
                windowBeforeMs: this.windowBeforeMs,
                windowAfterMs: this.windowAfterMs,
                detectionTime: new Date(nowMs).toISOString(),
                recoveryTime: null,
                lastReceivedAt: last.receivedAtIso,
                channelLabel: null,
                ruleSnapshot: null,
                mappingVersion: dev.configVersion,
                transportHealth: {
                  brokerConnected: this.metrics.brokerConnected,
                  brokerSubscribed: this.metrics.brokerSubscribed,
                },
                gaps: [{
                  startAt: last.receivedAtIso,
                  endAt: null,
                  durationMs: ageMs,
                  reason: 'Monitoring-path transport interruption (broker or worker offline)',
                }],
                extrema: {},
                samples: [],
                sourceEventIds: [],
              },
              acknowledgements: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            this.activeIncidents.set(transportKey, transportInc);
            await this.repo.saveIncident(transportInc);
          }
          return;
        }

        // Transport is healthy, but device is silent beyond lease -> Device Interruption
        if (!incident) {
          // Check cooldown for flapping deduplication
          const cooldown = this.cooldownMap.get(key);
          if (cooldown && nowMs - cooldown.resolvedAtMs < this.cooldownMs) {
            const prev = await this.repo.getIncidentById(dev.siteId, cooldown.incidentId);
            if (prev) {
              incident = prev;
              incident.state = 'evaluating';
              incident.evidence.recoveryTime = null;
              incident.endedAt = null;
              incident.evidence.gaps.push({
                startAt: last.receivedAtIso,
                endAt: null,
                durationMs: ageMs,
                reason: 'Flapping silence recurrence within cooldown',
              });
              this.activeIncidents.set(key, incident);
              await this.repo.saveIncident(incident);
            }
          }

          if (!incident) {
            incident = await this.createDeviceInterruptionIncident(dev.siteId, dev.rawDeviceId, last.receivedAtIso, ageMs);
            this.activeIncidents.set(key, incident);
          }
        } else {
          // Update duration of active silence
          incident.durationMs = Math.round(ageMs / 1000);
          const currentGap = incident.evidence.gaps[incident.evidence.gaps.length - 1];
          if (currentGap && !currentGap.endAt) {
            currentGap.durationMs = ageMs;
          }
          incident.summary = this.generateSummary(incident);
          await this.repo.saveIncident(incident);
        }
      }
    }
  }

  private async createElectricalIncident(
    sample: TelemetryPayload,
    rule: AlertRule,
    triggerVal: number
  ): Promise<IncidentRecord> {
    const id = crypto.randomUUID();
    const channels = await this.repo.getDeviceChannels(sample.siteId, sample.deviceId);
    const channel = channels.find((c) => c.rawChannelId === sample.channelId);
    const channelLabel = channel ? channel.label : (sample.channelId ?? 'All Channels');

    // Query 2-minute before-window samples from history
    const sampleTimeMs = new Date(sample.receivedAt).getTime();
    const fromIso = new Date(sampleTimeMs - this.windowBeforeMs).toISOString();
    const toIso = sample.receivedAt;
    const historySamples = await this.repo.getTelemetryHistory(
      sample.siteId,
      sample.deviceId,
      sample.channelId,
      fromIso,
      toIso,
      100
    );

    const beforePoints: IncidentSamplePoint[] = historySamples.map((s) => ({
      timestamp: s.receivedAt,
      voltage: s.values.voltage,
      current: s.values.current,
      power: s.values.power,
      frequency: s.values.frequency,
      energyRaw: s.values.energyRaw,
      channelId: s.channelId,
      phase: 'before',
      eventId: s.eventId,
    }));

    const extrema: IncidentExtrema = {
      minVoltage: sample.values.voltage ?? undefined,
      maxVoltage: sample.values.voltage ?? undefined,
      maxCurrent: sample.values.current ?? undefined,
      maxPower: sample.values.power ?? undefined,
      minFrequency: sample.values.frequency ?? undefined,
      maxFrequency: sample.values.frequency ?? undefined,
    };

    const incident: IncidentRecord = {
      id,
      siteId: sample.siteId,
      deviceId: sample.deviceId,
      channelId: sample.channelId,
      type: 'electrical_breach',
      severity: rule.severity,
      state: 'evaluating',
      title: `${channelLabel} ${rule.metric.toUpperCase()} Breach (${rule.operator} ${rule.threshold})`,
      summary: `${channelLabel} exceeded configured ${rule.metric} limit (${rule.operator} ${rule.threshold}) starting at ${sample.receivedAt}. Trigger value: ${triggerVal}.`,
      causeConfirmation: 'electrical_breach',
      startedAt: sample.receivedAt,
      endedAt: null,
      durationMs: 0,
      evidence: {
        windowBeforeMs: this.windowBeforeMs,
        windowAfterMs: this.windowAfterMs,
        detectionTime: sample.receivedAt,
        recoveryTime: null,
        lastReceivedAt: sample.receivedAt,
        channelLabel,
        ruleSnapshot: {
          ruleId: rule.id,
          metric: rule.metric,
          operator: rule.operator,
          threshold: rule.threshold,
          hysteresis: rule.hysteresis,
          debounceMs: rule.debounceMs,
          version: rule.version,
        },
        mappingVersion: sample.schemaVersion,
        transportHealth: {
          brokerConnected: this.metrics.brokerConnected,
          brokerSubscribed: this.metrics.brokerSubscribed,
        },
        gaps: [],
        extrema,
        samples: [
          ...beforePoints,
          {
            timestamp: sample.receivedAt,
            voltage: sample.values.voltage,
            current: sample.values.current,
            power: sample.values.power,
            frequency: sample.values.frequency,
            energyRaw: sample.values.energyRaw,
            channelId: sample.channelId,
            phase: 'during',
            eventId: sample.eventId,
          },
        ],
        sourceEventIds: [sample.eventId],
      },
      acknowledgements: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.repo.saveIncident(incident);
    return incident;
  }

  private async createDeviceInterruptionIncident(
    siteId: string,
    deviceId: string,
    lastReceivedAt: string,
    ageMs: number
  ): Promise<IncidentRecord> {
    const id = crypto.randomUUID();
    const lastTimeMs = new Date(lastReceivedAt).getTime();
    const fromIso = new Date(lastTimeMs - this.windowBeforeMs).toISOString();

    // Query 2-minute before-window samples across channels
    const historySamples = await this.repo.getTelemetryHistory(
      siteId,
      deviceId,
      'channel1',
      fromIso,
      lastReceivedAt,
      50
    );

    const beforePoints: IncidentSamplePoint[] = historySamples.map((s) => ({
      timestamp: s.receivedAt,
      voltage: s.values.voltage,
      current: s.values.current,
      power: s.values.power,
      frequency: s.values.frequency,
      energyRaw: s.values.energyRaw,
      channelId: s.channelId,
      phase: 'before',
      eventId: s.eventId,
    }));

    const incident: IncidentRecord = {
      id,
      siteId,
      deviceId,
      channelId: null,
      type: 'device_interruption',
      severity: 'warning',
      state: 'evaluating',
      title: `Device Telemetry Silence (${deviceId})`,
      summary: `No telemetry arrived from ${deviceId} for ${Math.round(ageMs / 1000)}s while transport was healthy. Physical power cut vs Wi-Fi/firmware failure unverified (Cause not confirmed).`,
      causeConfirmation: 'device_silence_unconfirmed',
      startedAt: lastReceivedAt,
      endedAt: null,
      durationMs: Math.round(ageMs / 1000),
      evidence: {
        windowBeforeMs: this.windowBeforeMs,
        windowAfterMs: this.windowAfterMs,
        detectionTime: new Date().toISOString(),
        recoveryTime: null,
        lastReceivedAt,
        channelLabel: null,
        ruleSnapshot: null,
        mappingVersion: 1,
        transportHealth: {
          brokerConnected: this.metrics.brokerConnected,
          brokerSubscribed: this.metrics.brokerSubscribed,
        },
        gaps: [{
          startAt: lastReceivedAt,
          endAt: null,
          durationMs: ageMs,
          reason: 'Hardware telemetry packet silence beyond cadence lease',
        }],
        extrema: {},
        samples: beforePoints,
        sourceEventIds: [],
      },
      acknowledgements: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.repo.saveIncident(incident);
    return incident;
  }

  private appendSampleToActiveIncidents(sample: TelemetryPayload): void {
    for (const incident of this.activeIncidents.values()) {
      if (incident.siteId !== sample.siteId || incident.deviceId !== sample.deviceId) continue;

      const phase = incident.evidence.recoveryTime ? 'after' : 'during';
      incident.evidence.samples.push({
        timestamp: sample.receivedAt,
        voltage: sample.values.voltage,
        current: sample.values.current,
        power: sample.values.power,
        frequency: sample.values.frequency,
        energyRaw: sample.values.energyRaw,
        channelId: sample.channelId,
        phase,
        eventId: sample.eventId,
      });

      if (!incident.evidence.sourceEventIds.includes(sample.eventId)) {
        incident.evidence.sourceEventIds.push(sample.eventId);
      }
    }
  }

  private updateExtrema(extrema: IncidentExtrema, values: TelemetryPayload['values']): void {
    if (values.voltage !== null) {
      extrema.minVoltage = extrema.minVoltage !== undefined ? Math.min(extrema.minVoltage, values.voltage) : values.voltage;
      extrema.maxVoltage = extrema.maxVoltage !== undefined ? Math.max(extrema.maxVoltage, values.voltage) : values.voltage;
    }
    if (values.current !== null) {
      extrema.maxCurrent = extrema.maxCurrent !== undefined ? Math.max(extrema.maxCurrent, values.current) : values.current;
    }
    if (values.power !== null) {
      extrema.maxPower = extrema.maxPower !== undefined ? Math.max(extrema.maxPower, values.power) : values.power;
    }
    if (values.frequency !== null) {
      extrema.minFrequency = extrema.minFrequency !== undefined ? Math.min(extrema.minFrequency, values.frequency) : values.frequency;
      extrema.maxFrequency = extrema.maxFrequency !== undefined ? Math.max(extrema.maxFrequency, values.frequency) : values.frequency;
    }
  }

  private generateSummary(incident: IncidentRecord): string {
    const durSec = incident.durationMs ?? 0;
    const durStr = durSec >= 60 ? `${Math.floor(durSec / 60)}m ${durSec % 60}s` : `${durSec}s`;

    if (incident.type === 'electrical_breach') {
      const ch = incident.evidence.channelLabel ?? incident.channelId ?? 'Channel';
      const rule = incident.evidence.ruleSnapshot;
      const rec = incident.evidence.recoveryTime ? ` Recovered at ${incident.evidence.recoveryTime}.` : ' Breach still active.';
      return `${ch} exceeded the configured ${rule?.metric ?? 'electrical'} limit (${rule?.operator} ${rule?.threshold}) for ${durStr}.${rec} Server-recorded receipt timestamps; missing data is not zero.`;
    }

    if (incident.type === 'device_interruption') {
      const gaps = incident.evidence.gaps.length;
      const flappingNote = gaps > 1 ? ` (${gaps} interruption intervals observed during flapping recurrence)` : '';
      const rec = incident.evidence.recoveryTime ? ` Recovered with fresh readings at ${incident.evidence.recoveryTime}.` : ' Device remains silent.';
      return `No readings arrived from ${incident.deviceId} for ${durStr}${flappingNote}; power state unconfirmed (Cause not confirmed: physical power cut vs Wi-Fi/firmware failure unverified).${rec}`;
    }

    return `Monitoring-path interruption detected on ${incident.deviceId} for ${durStr}. Broker or worker was offline. Device electrical power state unconfirmed during observation gap.`;
  }

  private checkViolation(val: number, op: string, threshold: number): boolean {
    if (op === 'gt') return val > threshold;
    if (op === 'gte') return val >= threshold;
    if (op === 'lt') return val < threshold;
    if (op === 'lte') return val <= threshold;
    return false;
  }

  private checkHysteresisClear(val: number, op: string, threshold: number, hysteresis: number): boolean {
    if (op === 'gt' || op === 'gte') return val <= threshold - hysteresis;
    if (op === 'lt' || op === 'lte') return val >= threshold + hysteresis;
    return false;
  }

  public getActiveIncidentList(): IncidentRecord[] {
    return Array.from(this.activeIncidents.values());
  }

  public setDeviceLastSeenForTesting(deviceId: string, receivedAtMs: number): void {
    this.deviceLastSeen.set(deviceId, {
      receivedAtMs,
      receivedAtIso: new Date(receivedAtMs).toISOString(),
    });
  }

  public generateDeterministicSummaryForTesting(opts: {
    type: 'electrical_breach' | 'device_interruption' | 'transport_outage';
    triggerMetric?: string;
    triggerValue?: number;
    durationMs?: number;
    channelId?: string;
    extrema?: Partial<IncidentExtrema>;
  }): string {
    return this.generateSummary({
      id: 'test',
      siteId: 'test',
      deviceId: 'dev-test',
      channelId: opts.channelId ?? null,
      title: 'Test',
      summary: '',
      severity: 'critical',
      state: 'evaluating',
      type: opts.type,
      causeConfirmation: opts.type === 'electrical_breach' ? 'electrical_breach' : 'device_silence_unconfirmed',
      startedAt: new Date().toISOString(),
      endedAt: null,
      durationMs: opts.durationMs ?? 30,
      evidence: {
        windowBeforeMs: 120000,
        windowAfterMs: 120000,
        detectionTime: new Date().toISOString(),
        recoveryTime: null,
        lastReceivedAt: new Date().toISOString(),
        channelLabel: opts.channelId ?? 'Channel',
        ruleSnapshot: {
          ruleId: 'test-rule',
          metric: opts.triggerMetric ?? 'voltage',
          operator: 'gt',
          threshold: 250,
          debounceMs: 0,
          hysteresis: 5,
          version: 1,
        },
        mappingVersion: 1,
        transportHealth: { brokerConnected: true, brokerSubscribed: true },
        samples: [],
        gaps: [],
        extrema: {
          minVoltage: undefined,
          maxVoltage: opts.extrema?.maxVoltage ?? 250,
          maxCurrent: undefined,
          maxPower: undefined,
          minFrequency: undefined,
          maxFrequency: undefined,
        },
        sourceEventIds: [],
      },
      acknowledgements: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  public escapeCsvForTesting(val: unknown): string {
    if (val === null || val === undefined) return '';
    let str = String(val);
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    if (/[",\n\r]/.test(str)) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}
