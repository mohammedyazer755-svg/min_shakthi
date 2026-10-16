import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { History } from '../../apps/web/src/pages/History.js';
import { Reports } from '../../apps/web/src/pages/Reports.js';
import { Alerts } from '../../apps/web/src/pages/Alerts.js';
import { Devices } from '../../apps/web/src/pages/Devices.js';
import { Settings } from '../../apps/web/src/pages/Settings.js';
import { AuthProvider } from '../../apps/web/src/auth/AuthContext.js';
import type { SnapshotChannel, TelemetryPayload } from '@minsakthi/contracts';

function createMockTelemetryState(deviceId = 'prototype1') {
  const sample1: TelemetryPayload = {
    schemaVersion: 1,
    eventId: 'aaaaaaaa-1111-4111-8111-111111111111',
    serverEpoch: 'eeeeeeee-1111-4111-8111-111111111111',
    sequence: 101,
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

  const channels: SnapshotChannel[] = [
    {
      channelId: 'channel1',
      rawChannelId: 'channel1',
      displaySlot: 1,
      label: 'Main Phase (CH01)',
      freshness: 'fresh',
      lastSample: sample1,
    },
    {
      channelId: 'channel2',
      rawChannelId: 'channel2',
      displaySlot: 2,
      label: 'Sub Load (CH02)',
      freshness: 'fresh',
      lastSample: null,
    },
  ];

  return {
    connectionState: 'connected' as const,
    snapshot: null,
    channels,
    health: {
      broker: 'connected' as const,
      backend: 'healthy' as const,
      database: 'connected' as const,
      timestamp: new Date().toISOString(),
      displayLatencyMs: 14,
    },
    coverage: {
      configuredChannels: 2,
      reportingChannels: 2,
      freshChannels: 2,
      isPartial: false,
    },
    lastDisplayLatencyMs: 14,
    livePackets: [sample1],
    powerHistory: { channel1: [{ timestamp: new Date().toISOString(), value: 33.22 }] },
    isViewPaused: false,
    pausedCatchupCount: 0,
    pauseView: () => {},
    resumeView: () => {},
  };
}

describe('Phase 5 E2E Screens Suite (History, Reports, Alerts, Devices, Settings)', () => {
  it('renders History screen with query filters, CSV export trigger, and sample table headers', () => {
    const telemetry = createMockTelemetryState('prototype1');
    const html = renderToString(
      React.createElement(
        AuthProvider,
        null,
        React.createElement(History, {
          telemetry,
          selectedDevice: 'prototype1',
        })
      )
    );

    expect(html).toContain('Historical Telemetry Logs &amp; Audit');
    expect(html).toContain('Export CSV');
    expect(html).toContain('Reset Query');
    expect(html).toContain('Channel:');
    expect(html).toContain('All Channels');
    expect(html).toContain('Window:');
    expect(html).toContain('Receipt Time (UTC)');
    expect(html).toContain('Event ID');
    expect(html).toContain('Energy (Raw)');
  });

  it('renders Reports screen with civil interval options, verified billing suppression notice, and coverage KPIs', () => {
    const telemetry = createMockTelemetryState('prototype1');
    const html = renderToString(
      React.createElement(
        AuthProvider,
        null,
        React.createElement(Reports, {
          telemetry,
          selectedDevice: 'prototype1',
        })
      )
    );

    expect(html).toContain('Certified Periodic Reports &amp; Tariffs');
    expect(html).toContain('Daily');
    expect(html).toContain('Monthly');
    expect(html).toContain('Asia/Kolkata (UTC+05:30)');
    expect(html).toContain('Generate Report');
    // Non-negotiable billing suppression notice
    expect(html).toContain('Contract Notice: Verified Billing Calculation Suppressed');
    expect(html).toContain('ESP32 raw legacy packets supply cumulative energy as uncalibrated tokens');
  });

  it('renders Alerts screen with evaluation health badge, status filters, and empty list prompt', () => {
    const telemetry = createMockTelemetryState('prototype1');
    const html = renderToString(
      React.createElement(
        AuthProvider,
        null,
        React.createElement(Alerts, {
          telemetry,
          selectedDevice: 'prototype1',
        })
      )
    );

    expect(html).toContain('Electrical Threshold Alerts &amp; Event Log');
    expect(html).toContain('Evaluation: Active &amp; Healthy');
    expect(html).toContain('Refresh');
    expect(html).toContain('open');
    expect(html).toContain('acknowledged');
    expect(html).toContain('resolved');
  });

  it('renders Devices screen with diagnostics KPIs, slot selector (CH01–CH05), and Config Version', () => {
    const telemetry = createMockTelemetryState('prototype1');
    const html = renderToString(
      React.createElement(
        AuthProvider,
        null,
        React.createElement(Devices, {
          telemetry,
          selectedDevice: 'prototype1',
        })
      )
    );

    expect(html).toContain('Device Diagnostics &amp; Channel Mapping Editor');
    expect(html).toContain('Config Version:');
    expect(html).toContain('Reload');
    expect(html).toContain('Hardware Channel Mappings (CH01–CH05)');
    expect(html).toContain('Raw Channel ID');
    expect(html).toContain('Display Slot');
  });

  it('renders Settings screen with user profile, display preferences, alert rules management, and sign out button', () => {
    const html = renderToString(
      React.createElement(
        AuthProvider,
        null,
        React.createElement(Settings, null)
      )
    );

    expect(html).toContain('Account Preferences &amp; Platform Configuration');
    expect(html).toContain('Sign Out');
    expect(html).toContain('User Profile');
    expect(html).toContain('Display Preferences');
    expect(html).toContain('Civil Timezone');
    expect(html).toContain('Default Device');
    expect(html).toContain('Threshold Alert Rules');
  });
});
