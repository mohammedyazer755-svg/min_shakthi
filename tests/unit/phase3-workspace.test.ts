import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Overview } from '../../apps/web/src/pages/Overview.js';
import { ChannelAnalytics } from '../../apps/web/src/pages/ChannelAnalytics.js';
import { OverallAnalytics } from '../../apps/web/src/pages/OverallAnalytics.js';
import { History } from '../../apps/web/src/pages/History.js';
import { Reports } from '../../apps/web/src/pages/Reports.js';
import { Alerts } from '../../apps/web/src/pages/Alerts.js';
import { Devices } from '../../apps/web/src/pages/Devices.js';
import { RealTime } from '../../apps/web/src/pages/RealTime.js';
import { Settings } from '../../apps/web/src/pages/Settings.js';
import { MeasurementChart } from '../../apps/web/src/components/MeasurementChart.js';
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
      current: 0.0,
      power: 0.0,
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
    streamStatus: { label: 'Live · Full', tone: 'positive' } as const,
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

describe('Phase 3 Clean Light Workspace Suite', () => {
  describe('1. Overview Content Budget & Truthful Presentation', () => {
    it('renders power, estimated cost, reporting channels, and alerts', () => {
      const telemetry = createMockTelemetryState();
      const html = renderToString(React.createElement(Overview, { telemetry, selectedDevice: 'prototype1' }));

      // Primary Cards
      expect(html).toContain('Power now');
      expect(html).toContain('Estimated cost rate');
      expect(html).toContain('33.2');
      expect(html).toContain('Channels reporting');
      expect(html).toContain('2/2');
      expect(html).toContain('Alerts needing attention');
      expect(html).toContain('0');
    });

    it('renders secondary measurements in expandable detail row (Voltage, Current, Frequency)', () => {
      const telemetry = createMockTelemetryState();
      const html = renderToString(React.createElement(Overview, { telemetry, selectedDevice: 'prototype1' }));

      expect(html).toContain('Electrical snapshot');
      expect(html).toContain('Supply voltage');
      expect(html).toContain('239.7 – 240.1 V');
      expect(html).toContain('Active current');
      expect(html).toContain('0.14 A');
      expect(html).toContain('Grid frequency');
      expect(html).toContain('49.98 – 50.01 Hz');
    });

    it('blanks current values to — when device is offline while preserving trend history', () => {
      const telemetry = createMockTelemetryState();
      telemetry.channels = telemetry.channels.map((ch) => ({
        ...ch,
        freshness: ch.freshness === 'unconfigured' ? 'unconfigured' : 'offline_inferred',
      }));
      telemetry.coverage = { configuredSlots: 2, reportingSlots: 0, partial: true };
      telemetry.streamStatus = { label: 'Offline', tone: 'critical' };

      const html = renderToString(React.createElement(Overview, { telemetry, selectedDevice: 'prototype1' }));

      // Current values blanked
      expect(html).not.toContain('239.67 V');
      expect(html).not.toContain('0.14 A');
      // Status & Trend preserved
      expect(html).toContain('Offline');
      expect(html).toContain('0/2 reporting');
      expect(html).toContain('Active Power Trend');
    });

    it('preserves valid zero readings on channels without treating them as missing', () => {
      const telemetry = createMockTelemetryState();
      const html = renderToString(React.createElement(Overview, { telemetry, selectedDevice: 'prototype1' }));

      expect(html).toContain('CH02');
      expect(html).toContain('0.00 A');
      expect(html).toContain('0.00 W');
    });

    it('shows a helpful waiting state without a fabricated plot when no power history exists', () => {
      const telemetry = createMockTelemetryState();
      telemetry.powerHistory = {};
      telemetry.channels = telemetry.channels.map(ch => ({ ...ch,
        freshness: ch.freshness === 'unconfigured' ? 'unconfigured' : 'offline_inferred',
      }));
      telemetry.coverage = { configuredSlots: 2, reportingSlots: 0, partial: true };
      const html = renderToString(React.createElement(Overview, { telemetry, selectedDevice: 'prototype1' }));
      expect(html).toContain('A clear picture starts with a reading.');
      expect(html).toContain('Your chart will build automatically when fresh measurements arrive from your device.');
      expect(html).toContain('No fresh readings');
      expect(html).not.toContain('<svg role="img"');
      expect(html).not.toContain('33.2 W');
    });

    it('never claims to receive readings with no configured channels', () => {
      const telemetry = createMockTelemetryState();
      telemetry.channels = [];
      telemetry.powerHistory = {};
      telemetry.coverage = { configuredSlots: 0, reportingSlots: 0, partial: false };
      const html = renderToString(React.createElement(Overview, { telemetry, selectedDevice: 'prototype1' }));
      expect(html).toContain('Waiting for channel setup');
      expect(html).not.toContain('Receiving readings');
      expect(html).not.toContain('Full reporting');
      expect(html).toContain('Checking channel configuration');
      expect(html.match(/class="overview-channel-row"/g)).toHaveLength(5);
    });

    it('preserves a checking status before telemetry arrives', () => {
      const telemetry = { ...createMockTelemetryState(), channels: [], powerHistory: {},
        streamStatus: { label: 'Checking', tone: 'unknown' } as const };
      const html = renderToString(React.createElement(Overview, { telemetry, selectedDevice: 'prototype1' }));
      expect(html).toContain('<strong>Checking</strong>');
      expect(html).not.toContain('Receiving readings');
      expect(html).toContain('Checking configuration');
      expect(html).not.toContain('No configured channels');
    });

    it('keeps connection interruptions visible before channel configuration loads', () => {
      const telemetry = { ...createMockTelemetryState(), channels: [], powerHistory: {},
        streamStatus: { label: 'Connection interrupted', tone: 'warning' } as const };
      const html = renderToString(React.createElement(Overview, { telemetry, selectedDevice: 'prototype1' }));
      expect(html).toContain('<strong>Connection interrupted</strong>');
      expect(html).not.toContain('Receiving readings');
    });
  });

  describe('2. MeasurementChart Responsive Sizing & Gap Discontinuity', () => {
    it('renders an isolated zero reading as a visible point on a usable time scale', () => {
      const html = renderToString(React.createElement(MeasurementChart, {
        title: 'Single reading',
        series: [{ id: 'ch1', name: 'Channel 1', color: '#171717', unit: 'W',
          data: [{ timestamp: '2026-10-17T06:00:00Z', value: 0 }] }],
      }));
      expect(html).toContain('<circle');
      expect(html).toContain('cx="418"');
      expect(html).toContain('0 W');
      expect(html).not.toContain('NaN');
    });

    it('renders explicit responsive plotting height and measured width with sr-only table', () => {
      const series = [
        {
          id: 'test_feed',
          name: 'Feed A',
          color: '#80601E',
          unit: 'W',
          data: [
            { timestamp: new Date(Date.now() - 30000).toISOString(), value: 45.2 },
            { timestamp: new Date(Date.now() - 15000).toISOString(), value: null }, // Gap
            { timestamp: new Date(Date.now()).toISOString(), value: 0.0 }, // Real zero
          ],
        },
      ];

      const html = renderToString(
        React.createElement(MeasurementChart, {
          title: 'Power Response',
          series,
          height: 280,
        })
      );

      // Height bounded
      expect(html).toContain('height="280"');
      expect(html).toContain('viewBox="0 0 800 280"');
      // Accessibility
      expect(html).toContain('role="img"');
      expect(html).toContain('class="sr-only"');
      expect(html).toContain('<caption>Power Response data table</caption>');
      expect(html).toContain('Missing (Gap)');
      expect(html).toContain('0 W');
    });

    it('renders deliberate empty state when no historical samples are present', () => {
      const html = renderToString(
        React.createElement(MeasurementChart, {
          title: 'Empty Feed',
          series: [],
          height: 280,
        })
      );

      expect(html).toContain('Awaiting historical telemetry samples...');
      expect(html).toContain('Gaps and intervals will render when data arrives.');
    });
  });

  describe('3. Semantic Design System Across Workspace Views', () => {
    it('verifies authenticated workspace views render without legacy dark inline tokens', () => {
      const telemetry = createMockTelemetryState();

      const views = [
        React.createElement(Overview, { telemetry, selectedDevice: 'prototype1' }),
        React.createElement(ChannelAnalytics, { telemetry, selectedDevice: 'prototype1' }),
        React.createElement(OverallAnalytics, { telemetry, selectedDevice: 'prototype1' }),
        React.createElement(AuthProvider, null, React.createElement(History, { telemetry, selectedDevice: 'prototype1' })),
        React.createElement(AuthProvider, null, React.createElement(Reports, { telemetry, selectedDevice: 'prototype1' })),
        React.createElement(AuthProvider, null, React.createElement(Alerts, { telemetry, selectedDevice: 'prototype1' })),
        React.createElement(AuthProvider, null, React.createElement(Devices, { telemetry, selectedDevice: 'prototype1' })),
        React.createElement(RealTime, { telemetry, selectedDevice: 'prototype1' }),
        React.createElement(AuthProvider, null, React.createElement(Settings, null)),
      ];

      for (const view of views) {
        const html = renderToString(view);
        // Ensure none of the authenticated views contain legacy --dark- tokens
        expect(html).not.toContain('--dark-canvas');
        expect(html).not.toContain('--dark-surface');
        expect(html).not.toContain('--dark-border');
        expect(html).not.toContain('--dark-text-primary');
        expect(html).not.toContain('--dark-text-muted');
        expect(html).not.toContain('--dark-accent');
      }
    });
  });
});
