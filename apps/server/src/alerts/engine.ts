import type {
  AlertRule,
  AlertRecord,
  AlertAcknowledgement,
  EvaluationHealth,
  TelemetryPayload,
} from '@minsakthi/contracts';

export interface PendingViolation {
  ruleId: string;
  deviceId: string;
  channelId: string | null;
  violationStartAt: number; // timestamp ms
  lastSeenValue: number;
}

export class AlertEngine {
  private rules = new Map<string, AlertRule>();
  private activeAlerts = new Map<string, AlertRecord>(); // alertId -> record
  private pendingViolations = new Map<string, PendingViolation>(); // compositeKey -> pending
  private acknowledgements = new Map<string, AlertAcknowledgement[]>(); // alertId -> acks
  private evaluationHealth: EvaluationHealth = 'healthy';

  constructor(initialRules: AlertRule[] = []) {
    for (const r of initialRules) {
      this.rules.set(r.id, r);
    }
  }

  public getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  public addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  public updateRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  public deleteRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  public getEvaluationHealth(): EvaluationHealth {
    return this.evaluationHealth;
  }

  public setEvaluationHealth(health: EvaluationHealth): void {
    this.evaluationHealth = health;
  }

  public getAlerts(filter?: {
    siteId?: string;
    deviceId?: string;
    state?: 'open' | 'acknowledged' | 'resolved';
  }): AlertRecord[] {
    let list = Array.from(this.activeAlerts.values());
    if (filter?.deviceId) {
      list = list.filter((a) => a.deviceId === filter.deviceId);
    }
    if (filter?.state) {
      list = list.filter((a) => a.state === filter.state);
    }
    return list.map((a) => ({
      ...a,
      rule: this.rules.get(a.ruleId),
      acknowledgements: this.acknowledgements.get(a.id) || [],
    }));
  }

  public getAlertById(alertId: string): AlertRecord | null {
    const a = this.activeAlerts.get(alertId);
    if (!a) return null;
    return {
      ...a,
      rule: this.rules.get(a.ruleId),
      acknowledgements: this.acknowledgements.get(a.id) || [],
    };
  }

  /**
   * Evaluate a sample against all enabled rules matching device and channel.
   * Stale/offline channels pause evaluation as required by T20.
   */
  public evaluateSample(sample: TelemetryPayload, isChannelFresh = true): AlertRecord[] {
    if (!isChannelFresh) {
      // T20: Stale pauses electrical evaluation, no false all-clear
      this.evaluationHealth = 'paused_stale';
      return [];
    }

    this.evaluationHealth = 'healthy';
    const sampleTimeMs = new Date(sample.receivedAt).getTime();
    const affectedAlerts: AlertRecord[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled || rule.deviceId !== sample.deviceId) {
        continue;
      }
      if (rule.channelId && rule.channelId !== sample.channelId) {
        continue;
      }

      // Extract metric value
      let val: number | null = null;
      if (rule.metric === 'voltage') val = sample.values.voltage;
      else if (rule.metric === 'current') val = sample.values.current;
      else if (rule.metric === 'power') val = sample.values.power;
      else if (rule.metric === 'frequency') val = sample.values.frequency;

      if (val === null || Number.isNaN(val)) {
        continue;
      }

      const key = `${rule.id}:${sample.deviceId}:${sample.channelId}`;
      const existingAlert = Array.from(this.activeAlerts.values()).find(
        (a) =>
          a.ruleId === rule.id &&
          a.deviceId === sample.deviceId &&
          a.channelId === sample.channelId &&
          (a.state === 'open' || a.state === 'acknowledged')
      );

      const isViolating = this.checkViolation(val, rule.operator, rule.threshold);

      if (isViolating) {
        // Sustained violation check with debounce
        let pending = this.pendingViolations.get(key);
        if (!pending) {
          pending = {
            ruleId: rule.id,
            deviceId: sample.deviceId,
            channelId: sample.channelId,
            violationStartAt: sampleTimeMs,
            lastSeenValue: val,
          };
          this.pendingViolations.set(key, pending);
        } else {
          pending.lastSeenValue = val;
        }

        const durationMs = sampleTimeMs - pending.violationStartAt;
        if (durationMs >= rule.debounceMs) {
          if (!existingAlert) {
            // Open new alert
            const alertId = crypto.randomUUID();
            const newAlert: AlertRecord = {
              id: alertId,
              ruleId: rule.id,
              deviceId: sample.deviceId,
              channelId: sample.channelId,
              openedAt: new Date(sampleTimeMs).toISOString(),
              resolvedAt: null,
              lastSeenAt: new Date(sampleTimeMs).toISOString(),
              state: 'open',
              triggerEventId: sample.eventId,
              triggerValue: val,
              violationStartAt: new Date(pending.violationStartAt).toISOString(),
              rule,
              acknowledgements: [],
            };
            this.activeAlerts.set(alertId, newAlert);
            affectedAlerts.push(newAlert);
          } else {
            // Update lastSeenAt
            existingAlert.lastSeenAt = new Date(sampleTimeMs).toISOString();
            existingAlert.triggerValue = val;
          }
        }
      } else {
        // Metric is not currently in direct violation
        // Check hysteresis to determine if existing open alert should resolve
        if (existingAlert) {
          const isCleared = this.checkHysteresisClear(
            val,
            rule.operator,
            rule.threshold,
            rule.hysteresis
          );
          if (isCleared) {
            existingAlert.state = 'resolved';
            existingAlert.resolvedAt = new Date(sampleTimeMs).toISOString();
            this.pendingViolations.delete(key);
            affectedAlerts.push(existingAlert);
          }
        } else {
          // If violation was pending but cleared before debounce, reset pending
          this.pendingViolations.delete(key);
        }
      }
    }

    return affectedAlerts;
  }

  private checkViolation(val: number, op: 'gt' | 'lt' | 'gte' | 'lte', threshold: number): boolean {
    if (op === 'gt') return val > threshold;
    if (op === 'gte') return val >= threshold;
    if (op === 'lt') return val < threshold;
    if (op === 'lte') return val <= threshold;
    return false;
  }

  private checkHysteresisClear(
    val: number,
    op: 'gt' | 'lt' | 'gte' | 'lte',
    threshold: number,
    hysteresis: number
  ): boolean {
    if (op === 'gt' || op === 'gte') {
      // High threshold: clears when value <= threshold - hysteresis
      return val <= threshold - hysteresis;
    }
    if (op === 'lt' || op === 'lte') {
      // Low threshold: clears when value >= threshold + hysteresis
      return val >= threshold + hysteresis;
    }
    return false;
  }

  /**
   * Acknowledge an alert independently (T21: multiple users, idempotent).
   * Does NOT resolve the alert.
   */
  public acknowledgeAlert(
    alertId: string,
    user: { id: string; displayName?: string },
    note?: string
  ): AlertRecord {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error('ALERT_NOT_FOUND');
    }

    const acks = this.acknowledgements.get(alertId) || [];
    const existingIndex = acks.findIndex((a) => a.userId === user.id);

    const ack: AlertAcknowledgement = {
      id: crypto.randomUUID(),
      alertId,
      userId: user.id,
      userDisplayName: user.displayName,
      ackAt: new Date().toISOString(),
      note: note || null,
    };

    if (existingIndex >= 0) {
      // Idempotent update
      acks[existingIndex] = ack;
    } else {
      acks.push(ack);
    }
    this.acknowledgements.set(alertId, acks);

    if (alert.state === 'open') {
      alert.state = 'acknowledged';
    }

    return {
      ...alert,
      rule: this.rules.get(alert.ruleId),
      acknowledgements: acks,
    };
  }
}
