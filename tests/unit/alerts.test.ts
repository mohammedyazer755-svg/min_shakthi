import { describe, it, expect, beforeEach } from 'vitest';
import { AlertEngine } from '../../apps/server/src/alerts/engine.js';
import type { AlertRule, TelemetryPayload } from '@minsakthi/contracts';

function makeMockSample(voltage: number, timeOffsetMs: number, eventId?: string): TelemetryPayload {
  const baseTime = 1760000000000;
  return {
    eventId: eventId || crypto.randomUUID(),
    siteId: '11111111-1111-4111-8111-111111111111',
    deviceId: 'prototype1',
    channelId: 'channel1',
    receivedAt: new Date(baseTime + timeOffsetMs).toISOString(),
    serverEpoch: '22222222-2222-4222-8222-222222222222',
    sequence: 1,
    retained: false,
    suspectDuplicate: false,
    quality: [],
    configVersion: 1,
    values: {
      voltage,
      current: 1.0,
      power: 240,
      energyRaw: '100',
      frequency: 50.0,
    },
  };
}

describe('Alerts Engine (Phase 5: R14, T20, T21)', () => {
  let engine: AlertEngine;

  const testRule: AlertRule = {
    id: 'rule-voltage-high',
    siteId: '11111111-1111-4111-8111-111111111111',
    deviceId: 'prototype1',
    channelId: 'channel1',
    metric: 'voltage',
    operator: 'gt',
    threshold: 250,
    hysteresis: 5, // clears at <= 245
    debounceMs: 3000, // 3s debounce
    severity: 'critical',
    enabled: true,
    version: 1,
  };

  beforeEach(() => {
    engine = new AlertEngine([testRule]);
  });

  it('T20: 251V for <3s does not open alert; sustained violation >= 3s opens alert once', () => {
    // 0s: 251V (violation starts)
    let alerts = engine.evaluateSample(makeMockSample(251, 0));
    expect(alerts.length).toBe(0);
    expect(engine.getAlerts({ deviceId: 'prototype1', state: 'open' }).length).toBe(0);

    // 2s: 251V (<3s debounce, still no alert)
    alerts = engine.evaluateSample(makeMockSample(251, 2000));
    expect(alerts.length).toBe(0);
    expect(engine.getAlerts({ deviceId: 'prototype1', state: 'open' }).length).toBe(0);

    // 3.5s: 251V (>= 3s debounce, alert opens!)
    alerts = engine.evaluateSample(makeMockSample(251, 3500));
    expect(alerts.length).toBe(1);
    expect(alerts[0]!.state).toBe('open');
    expect(alerts[0]!.triggerValue).toBe(251);

    // 5s: 252V (sustained violation: does not create a second alert)
    alerts = engine.evaluateSample(makeMockSample(252, 5000));
    expect(alerts.length).toBe(0); // already open, not re-fired
    const openAlerts = engine.getAlerts({ deviceId: 'prototype1', state: 'open' });
    expect(openAlerts.length).toBe(1);
  });

  it('T20: value dropping to 248V stays open due to hysteresis; dropping to <= 245V resolves alert', () => {
    // Fire the alert at 0s and 3.5s
    engine.evaluateSample(makeMockSample(251, 0));
    engine.evaluateSample(makeMockSample(251, 3500));
    expect(engine.getAlerts({ deviceId: 'prototype1', state: 'open' }).length).toBe(1);

    // 6s: drops to 248V (below 250, but above 250-5=245 hysteresis limit -> alert STAYS open)
    engine.evaluateSample(makeMockSample(248, 6000));
    expect(engine.getAlerts({ deviceId: 'prototype1', state: 'open' }).length).toBe(1);

    // 8s: drops to 244V (<= 245 -> alert resolves!)
    const resolved = engine.evaluateSample(makeMockSample(244, 8000));
    expect(resolved.length).toBe(1);
    expect(resolved[0]!.state).toBe('resolved');
    expect(resolved[0]!.resolvedAt).not.toBeNull();
    expect(engine.getAlerts({ deviceId: 'prototype1', state: 'open' }).length).toBe(0);
  });

  it('T20: stale channel pauses electrical evaluation without false all-clear', () => {
    // Stale sample received (isChannelFresh = false)
    const affected = engine.evaluateSample(makeMockSample(251, 0), false);
    expect(affected.length).toBe(0);
    expect(engine.getEvaluationHealth()).toBe('paused_stale');
  });

  it('T21: multiple users acknowledge independently; acknowledgement does not resolve alert; repeat request is idempotent', () => {
    // Fire alert
    engine.evaluateSample(makeMockSample(251, 0));
    const opened = engine.evaluateSample(makeMockSample(251, 3500));
    const alertId = opened[0]!.id;

    // Operator 1 acknowledges
    const ack1 = engine.acknowledgeAlert(
      alertId,
      { id: 'user-op-1', displayName: 'Operator Alice' },
      'Checking transformer 1'
    );
    expect(ack1.state).toBe('acknowledged');
    expect(ack1.acknowledgements.length).toBe(1);
    expect(ack1.acknowledgements[0]!.userDisplayName).toBe('Operator Alice');

    // Operator 2 acknowledges independently
    const ack2 = engine.acknowledgeAlert(
      alertId,
      { id: 'user-op-2', displayName: 'Operator Bob' },
      'Second observer confirmed'
    );
    expect(ack2.state).toBe('acknowledged');
    expect(ack2.acknowledgements.length).toBe(2);

    // Repeated request from Operator 1 (idempotent update)
    const ack1Repeat = engine.acknowledgeAlert(
      alertId,
      { id: 'user-op-1', displayName: 'Operator Alice' },
      'Updated note: checked breaker'
    );
    expect(ack1Repeat.acknowledgements.length).toBe(2);
    expect(ack1Repeat.acknowledgements[0]!.note).toBe('Updated note: checked breaker');

    // Alert remains NOT resolved until metric drops below hysteresis
    expect(ack1Repeat.state).toBe('acknowledged');
    expect(ack1Repeat.resolvedAt).toBeNull();
  });
});
