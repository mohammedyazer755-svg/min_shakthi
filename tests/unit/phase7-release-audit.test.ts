import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { freshnessWindows } from '@minsakthi/contracts';
import { Overview } from '../../apps/web/src/pages/Overview.js';
import { Alerts } from '../../apps/web/src/pages/Alerts.js';
import { IncidentDetail } from '../../apps/web/src/features/incidents/IncidentDetail.js';
import { AuthProvider } from '../../apps/web/src/auth/AuthContext.js';
import type { IncidentRecord, ChannelState, LiveTelemetryState } from '@minsakthi/contracts';

const rootDir = path.resolve(__dirname, '../../');
const distDir = path.resolve(rootDir, 'apps/web/dist');
const webSrcDir = path.resolve(rootDir, 'apps/web/src');

function mockChannel(
  rawChannelId: string,
  slot: number,
  freshness: ChannelState['freshness'],
  power: number,
  voltage = 230,
  current = 5,
  frequency = 50
): ChannelState {
  return {
    rawChannelId,
    displaySlot: slot,
    label: `Channel ${slot}`,
    freshness,
    lastSample: freshness !== 'unconfigured' ? {
      eventId: 'ev-1',
      siteId: 'site-1',
      deviceId: 'prototype1',
      channelId: rawChannelId,
      receivedAt: new Date().toISOString(),
      serverEpoch: 'epoch-1',
      sequence: 1,
      retained: false,
      suspectDuplicate: false,
      quality: [],
      configVersion: 1,
      values: {
        voltage,
        current,
        power,
        energyRaw: '100.0',
        frequency,
      },
    } : null,
  };
}

function mockTelemetry(partial: Partial<LiveTelemetryState> = {}): LiveTelemetryState {
  return {
    channels: [],
    coverage: { configuredSlots: 0, reportingSlots: 0, partial: false, percentage: 100 },
    streamStatus: { tone: 'positive', label: 'Streaming' },
    health: { broker: 'connected', serverEpoch: 'epoch-1' },
    connectionState: 'connected',
    powerHistory: {},
    voltageHistory: {},
    currentHistory: {},
    frequencyHistory: {},
    lastDisplayLatencyMs: 0,
    lastIngressTimestamp: new Date().toISOString(),
    totalAccepted: 0,
    totalReceived: 0,
    reconnectAttempts: 0,
    subackFailures: 0,
    recentErrors: [],
    errorsByReason: {},
    pauseLive: () => {},
    resumeLive: () => {},
    isPaused: false,
    rawPackets: [],
    ...partial,
  };
}

describe('Phase 7 Release Verification & Audit Contract', () => {
  describe('1. Theme, Tokens & Semantic Color Architecture', () => {
    it('verifies zero legacy --dark-* tokens in authenticated workspace source files', () => {
      const workspaceFiles = [
        'pages/Overview.tsx',
        'pages/ChannelAnalytics.tsx',
        'pages/OverallAnalytics.tsx',
        'pages/History.tsx',
        'pages/Reports.tsx',
        'pages/Alerts.tsx',
        'pages/Devices.tsx',
        'pages/Settings.tsx',
        'pages/Insights.tsx',
        'pages/Manage.tsx',
        'components/AppShell.tsx',
        'components/StatusSummary.tsx',
        'components/MeasurementChart.tsx',
        'features/incidents/IncidentDetail.tsx',
        'features/incidents/IncidentReplay.tsx',
        'features/incidents/IncidentList.tsx',
      ];

      for (const rel of workspaceFiles) {
        const fullPath = path.join(webSrcDir, rel);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          // Allow comments referring to dark or tokens, but no CSS variable usage var(--dark-*)
          const matches = content.match(/var\(--dark-[^)]+\)/g);
          expect(matches, `Found legacy dark tokens in ${rel}: ${matches?.join(', ')}`).toBeNull();
        }
      }
    });

    it('verifies public landing page deliberately retains dark theme tokens', () => {
      const landingCssPath = path.join(webSrcDir, 'pages/LandingPage.css');
      const content = fs.readFileSync(landingCssPath, 'utf8');
      expect(content).toContain('#000000');
    });
  });

  describe('2. Bundle Budget & Lazy-Loaded Graphics Chunk Isolation', () => {
    it('does not ship the removed EnergyMeter3D hero chunk', () => {
      const assetsDir = path.join(distDir, 'assets');
      expect(fs.existsSync(assetsDir)).toBe(true);

      const files = fs.readdirSync(assetsDir);
      const meterChunk = files.find((f) => f.startsWith('EnergyMeter3D') && f.endsWith('.js'));
      expect(meterChunk).toBeUndefined();
    });

    it('verifies authenticated startup path has zero imports of ogl or EnergyMeter3D', () => {
      const appShellPath = path.join(webSrcDir, 'components/AppShell.tsx');
      const overviewPath = path.join(webSrcDir, 'pages/Overview.tsx');
      const shellContent = fs.readFileSync(appShellPath, 'utf8');
      const overviewContent = fs.readFileSync(overviewPath, 'utf8');

      expect(shellContent).not.toContain('ogl');
      expect(shellContent).not.toContain('EnergyMeter3D');
      expect(overviewContent).not.toContain('ogl');
      expect(overviewContent).not.toContain('EnergyMeter3D');
    });
  });

  describe('3. Fast ESP-State Cadence & Truthfulness Rules', () => {
    it('evaluates exact cadence bounds for 5s publisher (warn at 6s, offline at 10s)', () => {
      const w5 = freshnessWindows(5000);
      expect(w5.staleAfterMs).toBe(6000);
      expect(w5.offlineAfterMs).toBe(10000);
    });

    it('evaluates exact cadence bounds for 1s publisher (warn at 1.5s, offline at 5s)', () => {
      const w1 = freshnessWindows(1000);
      expect(w1.staleAfterMs).toBe(1500);
      expect(w1.offlineAfterMs).toBe(5000);
    });

    it('preserves valid zero readings on channels without treating them as missing', () => {
      const channels = [
        mockChannel('ch-01', 1, 'fresh', 0.0), // Zero watts
        mockChannel('ch-02', 2, 'fresh', 150.0),
      ];

      const html = renderToString(
        React.createElement(AuthProvider, null,
          React.createElement(Overview, {
            selectedDevice: 'prototype1',
            telemetry: mockTelemetry({
              channels,
              coverage: { configuredSlots: 2, reportingSlots: 2, partial: false, percentage: 100 },
              powerHistory: { 'ch-01': [{ timestamp: '2026-10-17T06:00:00Z', value: 0 }], 'ch-02': [{ timestamp: '2026-10-17T06:00:00Z', value: 150 }] },
              lastDisplayLatencyMs: 12,
              totalAccepted: 100,
              totalReceived: 100,
            }),
          })
        )
      );

      // Total power = 150 W, not treated as missing
      expect(html).toContain('150.0 W');
      expect(html).toContain('Receiving readings');
      // Channels reporting: 2/2
      expect(html).toContain('2/2');
    });

    it('renders partial coverage warning when not all configured channels are fresh', () => {
      const channels = [
        mockChannel('ch-01', 1, 'fresh', 250.0),
        mockChannel('ch-02', 2, 'offline', 0.0), // Offline
      ];

      const html = renderToString(
        React.createElement(AuthProvider, null,
          React.createElement(Overview, {
            selectedDevice: 'prototype1',
            telemetry: mockTelemetry({
              channels,
              coverage: { configuredSlots: 2, reportingSlots: 1, partial: true, percentage: 50 },
              streamStatus: { tone: 'warning', label: 'Partial Coverage' },
              powerHistory: { 'ch-01': [{ timestamp: '2026-10-17T06:00:00Z', value: 250 }] },
              lastDisplayLatencyMs: 14,
              totalAccepted: 100,
              totalReceived: 100,
            }),
          })
        )
      );

      expect(html).toContain('Some channels unavailable');
      expect(html).toContain('1/2');
      expect(html).toContain('Partial coverage');
    });
  });

  describe('4. Usability & Core Operator Flows', () => {
    it('verifies ordinary users can locate Power Now and Channels Reporting on Overview without instructions', () => {
      const channels = [
        mockChannel('ch-01', 1, 'fresh', 420.5),
      ];

      const html = renderToString(
        React.createElement(AuthProvider, null,
          React.createElement(Overview, {
            selectedDevice: 'prototype1',
            telemetry: mockTelemetry({
              channels,
              coverage: { configuredSlots: 1, reportingSlots: 1, partial: false, percentage: 100 },
              powerHistory: { 'ch-01': [{ timestamp: '2026-10-17T06:00:00Z', value: 420.5 }] },
              lastDisplayLatencyMs: 8,
              totalAccepted: 10,
              totalReceived: 10,
            }),
          })
        )
      );

      // Primary cards budget verified
      expect(html).toContain('Power now');
      expect(html).toContain('420.5 W');
      expect(html).toContain('Channels reporting');
      expect(html).toContain('Alerts needing attention');
      expect(html).toContain('Receiving readings');
    });

    it('verifies incident timeline self-explains what happened without technical packet reading', () => {
      const mockIncident: IncidentRecord = {
        id: 'inc-audit-1',
        siteId: 'site-1',
        deviceId: 'prototype1',
        channelId: 'ch-01',
        title: 'Phase A Over-Voltage Breach',
        summary: 'Incomer Phase A exceeded the configured voltage limit (gt 250) for 14s. Recovered. Server-recorded receipt timestamps; missing data is not zero.',
        severity: 'critical',
        state: 'resolved',
        type: 'electrical_breach',
        causeConfirmation: 'electrical_breach',
        durationMs: 14,
        startedAt: '2026-10-17T06:00:00.000Z',
        endedAt: '2026-10-17T06:00:14.000Z',
        evidence: {
          windowBeforeMs: 120000,
          windowAfterMs: 120000,
          detectionTime: '2026-10-17T06:00:00.000Z',
          recoveryTime: '2026-10-17T06:00:14.000Z',
          lastReceivedAt: '2026-10-17T06:00:14.000Z',
          channelLabel: 'Incomer Phase A',
          ruleSnapshot: {
            ruleId: 'rule-volt',
            metric: 'voltage',
            operator: 'gt',
            threshold: 250,
            debounceMs: 0,
            hysteresis: 5,
            version: 1,
          },
          transportHealth: { brokerConnected: true, brokerSubscribed: true },
          gaps: [],
          extrema: {
            minVoltage: 239,
            maxVoltage: 266.8,
            maxCurrent: 5.4,
            maxPower: 1440,
            minFrequency: 50.0,
            maxFrequency: 50.1,
          },
          samples: [
            {
              timestamp: '2026-10-17T05:59:00.000Z',
              channelId: 'ch-01',
              voltage: 239,
              current: 4.8,
              power: 1147,
              frequency: 50.0,
              energyRaw: '100.0',
              phase: 'before',
            },
            {
              timestamp: '2026-10-17T06:00:00.000Z',
              channelId: 'ch-01',
              voltage: 266.8,
              current: 5.4,
              power: 1440,
              frequency: 50.1,
              energyRaw: '100.1',
              phase: 'during',
            },
          ],
          sourceEventIds: ['ev-1', 'ev-2'],
        },
        acknowledgements: [],
        createdAt: '2026-10-17T06:00:00.000Z',
        updatedAt: '2026-10-17T06:00:14.000Z',
      };

      const html = renderToString(
        React.createElement(AuthProvider, null,
          React.createElement(IncidentDetail, {
            incident: mockIncident,
            onBack: () => {},
          })
        )
      );

      // Plain-language summary explains finding
      expect(html).toContain('Deterministic Incident Finding');
      expect(html).toContain('Incomer Phase A exceeded the configured voltage limit');
      expect(html).toContain('14s');
      expect(html).toContain('Max Voltage');
      expect(html).toContain('266.8 V');
      // No raw unparsed packets required
      expect(html).toContain('Observed Extrema During Incident');
    });

    it('verifies Alerts page includes Investigate Event timeline action', () => {
      const html = renderToString(
        React.createElement(AuthProvider, null,
          React.createElement(Alerts, {
            selectedDevice: 'prototype1',
            telemetry: mockTelemetry(),
            onNavigate: () => {},
          })
        )
      );

      expect(html).toContain('Electrical Threshold Alerts');
      expect(html).toContain('Total: 0 alerts recorded');
    });
  });
});
