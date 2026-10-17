import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { freshnessWindows, readingFreshness, type SystemHealth, type SnapshotChannel } from '@minsakthi/contracts';
import { deviceStreamStatus } from '../../apps/web/src/live/status';
import { AppShell } from '../../apps/web/src/components/AppShell';
import { LandingPage } from '../../apps/web/src/pages/LandingPage';
import { AuthProvider } from '../../apps/web/src/auth/AuthContext';

function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '').trim();
  const bigint = parseInt(cleanHex, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function srgbToLinear(c: number): number {
  const norm = c / 255;
  return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

function getLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Phase 1 Foundation & Truthful States Suite', () => {
  const tokensPath = path.resolve(__dirname, '../../apps/web/src/styles/tokens.css');
  const tokensContent = fs.readFileSync(tokensPath, 'utf-8');
  const indexCssPath = path.resolve(__dirname, '../../apps/web/src/styles/index.css');
  const indexCssContent = fs.readFileSync(indexCssPath, 'utf-8');

  describe('1. Fast, Truthful Cadence-Aware Freshness & Expiration Policy', () => {
    const testNow = Date.parse('2026-10-17T12:00:00.000Z');

    it('implements 5-second publisher cadence: warns at 6s, infers offline at 10s', () => {
      const windows = freshnessWindows(5000);
      expect(windows.staleAfterMs).toBe(6000);
      expect(windows.offlineAfterMs).toBe(10000);

      // Fresh at 5s
      const freshSample = readingFreshness({
        receivedAt: new Date(testNow - 5000).toISOString(),
        nowMs: testNow,
        expectedIntervalMs: 5000,
      });
      expect(freshSample).toBe('fresh');

      // Warn (stale) at 6s
      const staleSample = readingFreshness({
        receivedAt: new Date(testNow - 6000).toISOString(),
        nowMs: testNow,
        expectedIntervalMs: 5000,
      });
      expect(staleSample).toBe('stale');

      // Infer offline at 10s
      const offlineSample = readingFreshness({
        receivedAt: new Date(testNow - 10000).toISOString(),
        nowMs: testNow,
        expectedIntervalMs: 5000,
      });
      expect(offlineSample).toBe('offline_inferred');
    });

    it('implements 1-second heartbeat publisher cadence: warns at 1.5s, infers offline at 5s', () => {
      const windows = freshnessWindows(1000);
      expect(windows.staleAfterMs).toBe(1500);
      expect(windows.offlineAfterMs).toBe(5000);

      // Fresh at 1s
      expect(readingFreshness({
        receivedAt: new Date(testNow - 1000).toISOString(),
        nowMs: testNow,
        expectedIntervalMs: 1000,
      })).toBe('fresh');

      // Warn (stale) at 1.5s
      expect(readingFreshness({
        receivedAt: new Date(testNow - 1500).toISOString(),
        nowMs: testNow,
        expectedIntervalMs: 1000,
      })).toBe('stale');

      // Infer offline at 5s
      expect(readingFreshness({
        receivedAt: new Date(testNow - 5000).toISOString(),
        nowMs: testNow,
        expectedIntervalMs: 1000,
      })).toBe('offline_inferred');
    });

    it('strictly forbids retained messages from restoring live status', () => {
      const retainedSample = readingFreshness({
        receivedAt: new Date(testNow).toISOString(),
        retained: true,
        nowMs: testNow,
      });
      expect(retainedSample).toBe('stale');
    });

    it('requires healthy transport for offline inference to avoid false physical power cut claims', () => {
      // When transport is broken, age out to stale/unknown, NOT offline_inferred
      const transportDown = readingFreshness({
        receivedAt: new Date(testNow - 60000).toISOString(),
        nowMs: testNow,
        transportAvailable: false,
      });
      expect(transportDown).toBe('stale');
    });
  });

  describe('2. Truthful Stream Status & Device Dot Derivations', () => {
    const healthOk: SystemHealth = {
      process: 'healthy',
      broker: 'connected',
      brokerSubscribed: true,
      database: 'healthy',
      persistenceLagMs: 0,
    };

    const mockChannel = (freshness: SnapshotChannel['freshness']): SnapshotChannel => ({
      rawChannelId: 'ch1',
      displaySlot: 1,
      label: 'Channel 1',
      lastReceivedAt: new Date().toISOString(),
      freshness,
      lastSample: freshness === 'fresh' ? {
        schemaVersion: 1,
        eventId: 'test-event-id',
        serverEpoch: 'test-epoch',
        sequence: '1',
        siteId: 'site1',
        deviceId: 'prototype1',
        channelId: 'ch1',
        receivedAt: new Date().toISOString(),
        deviceTimestamp: null,
        values: { voltage: 230, current: 1, power: 230, energyRaw: '10', frequency: 50 },
        energyUnit: 'unknown',
        quality: [],
        retained: false,
        persistence: 'committed',
      } : null,
    });

    it('reports Connection lost when socket is disconnected regardless of health or channel history', () => {
      const status = deviceStreamStatus([mockChannel('fresh')], false, healthOk);
      expect(status.label).toBe('Connection lost');
      expect(status.tone).toBe('warning');
    });

    it('reports Checking and tone unknown when health is missing/null', () => {
      const status = deviceStreamStatus([mockChannel('fresh')], true, null);
      expect(status.label).toBe('Checking');
      expect(status.tone).toBe('unknown');
    });

    it('reports Connection interrupted when broker or database is degraded', () => {
      const brokenBroker = deviceStreamStatus([mockChannel('fresh')], true, { ...healthOk, broker: 'disconnected' });
      expect(brokenBroker.label).toBe('Connection interrupted');
      expect(brokenBroker.tone).toBe('warning');

      const brokenDb = deviceStreamStatus([mockChannel('fresh')], true, { ...healthOk, database: 'degraded' });
      expect(brokenDb.label).toBe('Connection interrupted');
      expect(brokenDb.tone).toBe('warning');
    });

    it('distinguishes Full Live vs Partial Live coverage', () => {
      const full = deviceStreamStatus([mockChannel('fresh'), mockChannel('fresh')], true, healthOk);
      expect(full.label).toBe('Live');
      expect(full.tone).toBe('positive');

      const partial = deviceStreamStatus([mockChannel('fresh'), mockChannel('stale')], true, healthOk);
      expect(partial.label).toBe('Live · Partial');
      expect(partial.tone).toBe('positive');
    });

    it('reports Offline (inferred) when all channels have exceeded offline lease', () => {
      const offline = deviceStreamStatus([mockChannel('offline_inferred')], true, healthOk);
      expect(offline.label).toBe('Offline (inferred)');
      expect(offline.tone).toBe('critical');
    });

    it('never defaults device dot to healthy in AppShell markup when status is unknown or disconnected', () => {
      const htmlDisconnected = renderToString(
        React.createElement(AuthProvider, null,
          React.createElement(AppShell, {
            selectedDevice: 'prototype1',
            socketConnected: false,
            health: null,
            channels: [],
          }, React.createElement('div', null, 'Content'))
        )
      );
      // Ensure the device dot is styled with warning/unknown, not positive healthy green
      expect(htmlDisconnected).not.toContain('style="background:var(--status-ok)"');
    });
  });

  describe('3. Scoped Semantic Tokens & Contrast Ratios', () => {
    it('defines scoped theme blocks for :root, [data-theme="light"], and [data-theme="dark"]', () => {
      expect(tokensContent).toContain('[data-theme="light"]');
      expect(tokensContent).toContain('[data-theme="dark"]');
      expect(tokensContent).toContain('--canvas:');
      expect(tokensContent).toContain('--surface:');
      expect(tokensContent).toContain('--text-primary:');
      expect(tokensContent).toContain('--border:');
      expect(tokensContent).toContain('--focus-ring:');
    });

    it('verifies contrast of primary text (#202321) on surface (#FFFFFF) passes WCAG AAA (>= 7:1)', () => {
      const ratio = getContrastRatio('#FFFFFF', '#202321');
      expect(ratio).toBeGreaterThan(10.0);
    });

    it('verifies contrast of secondary text (#5D625D) on canvas (#F7F6F2) passes WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio('#F7F6F2', '#5D625D');
      expect(ratio).toBeGreaterThan(4.5);
    });

    it('verifies contrast of dark gold accent text (#725719) on canvas (#F7F6F2) passes WCAG AA (>= 4.5:1)', () => {
      const ratio = getContrastRatio('#F7F6F2', '#725719');
      expect(ratio).toBeGreaterThan(4.5);
    });

    it('verifies contrast of status text on white surface passes WCAG AA (>= 4.5:1)', () => {
      expect(getContrastRatio('#FFFFFF', '#176344')).toBeGreaterThan(4.5);
      expect(getContrastRatio('#FFFFFF', '#805300')).toBeGreaterThan(4.5);
      expect(getContrastRatio('#FFFFFF', '#A52E2E')).toBeGreaterThan(4.5);
    });
  });

  describe('4. Keyboard Focus and Accessibility Foundations', () => {
    it('verifies :focus-visible rules with outline and offset are defined in index.css', () => {
      expect(indexCssContent).toContain(':focus-visible');
      expect(indexCssContent).toContain('outline: var(--focus-ring-width, 2px) solid var(--focus-ring)');
      expect(indexCssContent).toContain('outline-offset: var(--focus-ring-offset, 2px)');
    });

    it('verifies Skip to main content landmark is rendered with #main-content target and tabindex=-1', () => {
      const html = renderToString(
        React.createElement(AuthProvider, null,
          React.createElement(AppShell, { selectedDevice: 'prototype1' },
            React.createElement('div', null, 'Content')
          )
        )
      );
      expect(html).toContain('href="#main-content"');
      expect(html).toContain('Skip to main content');
      expect(html).toContain('id="main-content"');
      expect(html).toContain('tabindex="-1"');
    });
  });

  describe('5. Truthful Public Landing (No Fake Readings, Abstract Illustration)', () => {
    it('renders abstract non-operational illustration on LandingPage without fake operational ticker', () => {
      const html = renderToString(
        React.createElement(AuthProvider, null,
          React.createElement(LandingPage, null)
        )
      );
      expect(html).toContain('Five physical channel inputs connected to one energy workspace');
      expect(html).toContain('Illustrative architecture · No live readings');
      expect(html).not.toContain('50.00 Hz Pure Sine Grid Reference');
      expect(html).toContain('Secure access');
      // No synthetic live telemetry claims
      expect(html).not.toContain('Live Ingestion Active');
      expect(html).not.toContain('calibrated on-chip');
    });
  });
});
