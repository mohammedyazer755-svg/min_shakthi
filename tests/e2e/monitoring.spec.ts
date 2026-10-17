import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { SignIn } from '../../apps/web/src/pages/SignIn.js';
import { Overview } from '../../apps/web/src/pages/Overview.js';
import { OverallAnalytics } from '../../apps/web/src/pages/OverallAnalytics.js';
import { ChannelAnalytics } from '../../apps/web/src/pages/ChannelAnalytics.js';
import { RealTime } from '../../apps/web/src/pages/RealTime.js';
import { AuthProvider } from '../../apps/web/src/auth/AuthContext.js';
import type { SnapshotChannel, TelemetryPayload } from '@minsakthi/contracts';

function createMockTelemetryState(deviceId = 'prototype1') {
  const sample1: TelemetryPayload = {
    schemaVersion: 1,
    eventId: 'aaaaaaaa-1111-4111-8111-111111111111',
    serverEpoch: 'eeeeeeee-1111-4111-8111-111111111111',
    sequence: '101',
    siteId: 'site_default',
    deviceId,
    channelId: 'channel1',
    receivedAt: new Date(Date.now() - 2000).toISOString(),
    deviceTimestamp: null,
    values: {
      voltage: 239.67,
      current: 0.14,
      power: 33.22,
      energyRaw: '88.11',
      frequency: 49.98,
    },
    energyUnit: 'unknown',
    quality: [],
    retained: false,
    persistence: 'committed',
  };

  const sample2Zero: TelemetryPayload = {
    schemaVersion: 1,
    eventId: 'bbbbbbbb-2222-4222-8222-222222222222',
    serverEpoch: 'eeeeeeee-1111-4111-8111-111111111111',
    sequence: '102',
    siteId: 'site_default',
    deviceId,
    channelId: 'channel2',
    receivedAt: new Date(Date.now() - 3000).toISOString(),
    deviceTimestamp: null,
    values: {
      voltage: 240.1,
      current: 0.0, // Valid zero
      power: 0.0, // Valid zero
      energyRaw: '12.45',
      frequency: 50.01,
    },
    energyUnit: 'unknown',
    quality: [],
    retained: false,
    persistence: 'committed',
  };

  const channels: SnapshotChannel[] = [
    {
      rawChannelId: 'channel1',
      displaySlot: 1,
      label: 'Main Phase (CH01)',
      lastSample: sample1,
      lastReceivedAt: sample1.receivedAt,
      freshness: 'fresh',
    },
    {
      rawChannelId: 'channel2',
      displaySlot: 2,
      label: 'Sub Load (CH02)',
      lastSample: sample2Zero,
      lastReceivedAt: sample2Zero.receivedAt,
      freshness: 'fresh',
    },
    {
      rawChannelId: 'slot_3',
      displaySlot: 3,
      label: 'Channel 3 (Unconfigured)',
      lastSample: null,
      lastReceivedAt: null,
      freshness: 'unconfigured',
    },
    {
      rawChannelId: 'slot_4',
      displaySlot: 4,
      label: 'Channel 4 (Unconfigured)',
      lastSample: null,
      lastReceivedAt: null,
      freshness: 'unconfigured',
    },
    {
      rawChannelId: 'slot_5',
      displaySlot: 5,
      label: 'Channel 5 (Unconfigured)',
      lastSample: null,
      lastReceivedAt: null,
      freshness: 'unconfigured',
    },
  ];

  return {
    connectionState: 'connected' as const,
    streamStatus: {label:'Live · Partial',tone:'positive'} as const,
    snapshot: null,
    channels,
    health: {
      process: 'healthy' as const,
      broker: 'connected' as const,
      brokerSubscribed: true,
      database: 'healthy' as const,
      persistenceLagMs: 12,
    },
    coverage: {
      configuredSlots: 2,
      reportingSlots: 2,
      partial: false,
    },
    lastDisplayLatencyMs: 14,
    livePackets: [sample1, sample2Zero],
    powerHistory: {
      channel1: [
        { timestamp: new Date(Date.now() - 10000).toISOString(), value: 30.5 },
        { timestamp: new Date(Date.now() - 5000).toISOString(), value: 33.22 },
      ],
      channel2: [
        { timestamp: new Date(Date.now() - 10000).toISOString(), value: 0.0 },
        { timestamp: new Date(Date.now() - 5000).toISOString(), value: 0.0 },
      ],
    },
    isViewPaused: false,
    pausedCatchupCount: 0,
    pauseView: () => {},
    resumeView: () => {},
  };
}

describe('Monitoring E2E Suite (Phase 4: Five monitoring screens)', () => {
  it('renders SignIn screen with work email, password toggle, and test identity selectors', () => {
    const html = renderToString(
      React.createElement(
        AuthProvider,
        null,
        React.createElement(SignIn, null)
      )
    );

    expect(html).toContain('MIN-SAKTHI ENERGY INTELLIGENCE');
    expect(html).toContain('Work Email');
    expect(html).toContain('Password');
    expect(html).toContain('Test Identities');
    expect(html).toContain('Admin');
    expect(html).toContain('Operator');
    expect(html).toContain('Viewer');
    // Security check: no hardcoded password string in output
    expect(html).not.toContain('TestPassword123!');
  });

  it('renders Overview screen with active power KPI, partial coverage, and 5 mapped channel slots', () => {
    const telemetry = createMockTelemetryState('prototype1');
    const html = renderToString(
      React.createElement(Overview, {
        telemetry,
        selectedDevice: 'prototype1',
      })
    );

    // Header & KPIs
    expect(html).toContain('prototype1');
    expect(html).toContain('ESP: Live · Partial');
    expect(html).toContain('Power now');
    expect(html).toContain('33.2'); // Active power sum
    expect(html).toContain('Supply Voltage');
    expect(html).toContain('239.7 – 240.1 V');

    // Mapped table slots
    expect(html).toContain('Hardware Channel Mappings (CH01–CH05)');
    expect(html).toContain('CH01');
    expect(html).toContain('Main Phase (CH01)');
    expect(html).toContain('239.67 V');
    expect(html).toContain('0.14 A');

    // Valid zero load check (R08: zero remains zero)
    expect(html).toContain('CH02');
    expect(html).toContain('0.00 A');
    expect(html).toContain('0.00 W');

    // Unconfigured slot check (PRD: unconfigured slots report null readings without fake data)
    expect(html).toContain('CH03');
    expect(html).toContain('Channel 3 (Unconfigured)');

    // Real latency probe
    expect(html).toContain('Display ACK:');
    expect(html).toContain('14ms');
  });

  it('removes expired readings from current cards and rows while keeping historical trends', () => {
    const telemetry = createMockTelemetryState('prototype1');
    telemetry.channels = telemetry.channels.map(ch => ({ ...ch,
      freshness:ch.freshness === 'unconfigured' ? 'unconfigured' : 'offline_inferred',
    }));
    telemetry.coverage = { configuredSlots:2,reportingSlots:0,partial:true };
    const html = renderToString(React.createElement(Overview,{telemetry,selectedDevice:'prototype1'}));
    expect(html).not.toContain('239.67 V');
    expect(html).not.toContain('0.14 A');
    expect(html).toContain('0/2 reporting');
    expect(html).toContain('Offline');
    expect(html).toContain('Active Power Trend');
  });

  it('renders OverallAnalytics screen with time range picker and verified billing suppression notice', () => {
    const telemetry = createMockTelemetryState('prototype1');
    const html = renderToString(
      React.createElement(OverallAnalytics, {
        telemetry,
        selectedDevice: 'prototype1',
      })
    );

    expect(html).toContain('Overall Energy &amp; Load Analytics');
    expect(html).toContain('Window:');
    expect(html).toContain('15m');
    expect(html).toContain('1h');
    expect(html).toContain('6h');
    expect(html).toContain('24h');

    // Non-negotiable contract: Verified billing suppression disclosure (R12, R13)
    expect(html).toContain('Contract Notice: Verified Billing Calculation Suppressed');
    expect(html).toContain('ESP32 raw legacy packets supply cumulative energy as uncalibrated tokens');

    // Dispersion table
    expect(html).toContain('Channel Load Contribution &amp; Dispersion');
    expect(html).toContain('CH01');
    expect(html).toContain('33.22 W');
  });

  it('renders ChannelAnalytics screen with slot tabs and detailed electrical inspection', () => {
    const telemetry = createMockTelemetryState('prototype1');
    const html = renderToString(
      React.createElement(ChannelAnalytics, {
        telemetry,
        selectedDevice: 'prototype1',
      })
    );

    expect(html).toContain('CH01');
    expect(html).toContain('CH02');
    expect(html).toContain('CH03');
    expect(html).toContain('CH04');
    expect(html).toContain('CH05');

    // Active power, voltage, current, frequency
    expect(html).toContain('Phase Voltage');
    expect(html).toContain('239.67 V');
    expect(html).toContain('Phase Current');
    expect(html).toContain('0.14 A');
    expect(html).toContain('Cumulative Raw Energy Counter');
    expect(html).toContain('88.11');
    expect(html).toContain('Unit unverified (tokens)');
  });

  it('renders RealTime streaming screen with bounded packet rows and pause view button', () => {
    const telemetry = createMockTelemetryState('prototype1');
    const html = renderToString(
      React.createElement(RealTime, {
        telemetry,
        selectedDevice: 'prototype1',
      })
    );

    expect(html).toContain('Recent telemetry packets');
    expect(html).toContain('Bounded to last 200 packets');
    expect(html).toContain('Pause View');
    expect(html).toContain('All Channels');

    // Packet details with exact event IDs and sequence numbers
    expect(html).toContain('aaaaaaaa...');
    expect(html).toContain('#101');
    expect(html).toContain('channel1');
    expect(html).toContain('33.22 W');
    expect(html).toContain('88.11');
    expect(html).toContain('ACK:');
    expect(html).toContain('14ms');
  });
});
