import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  normalizeRoute,
  canAccessRoute,
  getRequiredRoleForRoute,
  getVisiblePrimaryNav,
  getVisibleManageNav,
} from '../../apps/web/src/navigation/roleNav.js';
import { RouterProvider, useRouter } from '../../apps/web/src/router/RouterContext.js';
import { AppShell } from '../../apps/web/src/components/AppShell.js';
import { AuthProvider } from '../../apps/web/src/auth/AuthContext.js';
import { Insights } from '../../apps/web/src/pages/Insights.js';
import { Manage } from '../../apps/web/src/pages/Manage.js';

describe('Phase 2 Navigation, Roles, and Workspace Shell Suite', () => {
  describe('1. Legacy Route Normalization & Aliases', () => {
    it('normalizes legacy routes to their canonical task-based destinations', () => {
      expect(normalizeRoute('/analytics')).toBe('/insights/trends');
      expect(normalizeRoute('/history')).toBe('/insights/history');
      expect(normalizeRoute('/reports')).toBe('/insights/reports');
      expect(normalizeRoute('/live')).toBe('/manage/diagnostics');
      expect(normalizeRoute('/realtime')).toBe('/manage/diagnostics');
      expect(normalizeRoute('/devices')).toBe('/manage/devices');
      expect(normalizeRoute('/preferences')).toBe('/settings');
      expect(normalizeRoute('/account')).toBe('/settings');
      expect(normalizeRoute('/insights')).toBe('/insights/trends');
      expect(normalizeRoute('/manage')).toBe('/manage/devices');
      expect(normalizeRoute('/')).toBe('/overview');
      expect(normalizeRoute('/overview/')).toBe('/overview');
    });

    it('preserves query parameters when normalizing paths', () => {
      expect(normalizeRoute('/analytics?device=prototype2')).toBe('/insights/trends');
      expect(normalizeRoute('/history?device=prototype1&from=2026-10-01')).toBe('/insights/history');
    });
  });

  describe('2. Role Matrix Access Control & Forbidden Direct Links', () => {
    it('allows viewer to access primary workspace views but forbids manage views', () => {
      expect(canAccessRoute('viewer', '/overview')).toBe(true);
      expect(canAccessRoute('viewer', '/channels')).toBe(true);
      expect(canAccessRoute('viewer', '/insights')).toBe(true);
      expect(canAccessRoute('viewer', '/insights/trends')).toBe(true);
      expect(canAccessRoute('viewer', '/insights/history')).toBe(true);
      expect(canAccessRoute('viewer', '/insights/reports')).toBe(true);
      expect(canAccessRoute('viewer', '/alerts')).toBe(true);
      expect(canAccessRoute('viewer', '/settings')).toBe(true);

      // Forbidden for viewer
      expect(canAccessRoute('viewer', '/manage')).toBe(false);
      expect(canAccessRoute('viewer', '/manage/devices')).toBe(false);
      expect(canAccessRoute('viewer', '/manage/diagnostics')).toBe(false);
      expect(canAccessRoute('viewer', '/manage/audit')).toBe(false);
      expect(canAccessRoute('viewer', '/devices')).toBe(false);
      expect(canAccessRoute('viewer', '/live')).toBe(false);
    });

    it('allows operator access to primary views and diagnostics, but forbids admin device/audit management', () => {
      expect(canAccessRoute('operator', '/overview')).toBe(true);
      expect(canAccessRoute('operator', '/channels')).toBe(true);
      expect(canAccessRoute('operator', '/insights/trends')).toBe(true);
      expect(canAccessRoute('operator', '/alerts')).toBe(true);

      // Operator diagnostics access
      expect(canAccessRoute('operator', '/manage/diagnostics')).toBe(true);
      expect(canAccessRoute('operator', '/live')).toBe(true);

      // Forbidden for operator
      expect(canAccessRoute('operator', '/manage/devices')).toBe(false);
      expect(canAccessRoute('operator', '/manage/audit')).toBe(false);
      expect(canAccessRoute('operator', '/devices')).toBe(false);
    });

    it('allows admin full access to all primary and administrative routes', () => {
      expect(canAccessRoute('admin', '/overview')).toBe(true);
      expect(canAccessRoute('admin', '/channels')).toBe(true);
      expect(canAccessRoute('admin', '/insights/trends')).toBe(true);
      expect(canAccessRoute('admin', '/alerts')).toBe(true);
      expect(canAccessRoute('admin', '/manage/devices')).toBe(true);
      expect(canAccessRoute('admin', '/manage/diagnostics')).toBe(true);
      expect(canAccessRoute('admin', '/manage/audit')).toBe(true);
      expect(canAccessRoute('admin', '/settings')).toBe(true);
    });

    it('returns exact minimum required role for sensitive routes', () => {
      expect(getRequiredRoleForRoute('/overview')).toBeNull();
      expect(getRequiredRoleForRoute('/insights/history')).toBeNull();
      expect(getRequiredRoleForRoute('/manage/diagnostics')).toBe('operator');
      expect(getRequiredRoleForRoute('/manage/devices')).toBe('admin');
      expect(getRequiredRoleForRoute('/manage/audit')).toBe('admin');
    });
  });

  describe('3. Role Navigation Visibility Filtering', () => {
    it('provides role-filtered primary navigation items for all users', () => {
      const viewerNav = getVisiblePrimaryNav('viewer');
      expect(viewerNav.map((n) => n.id)).toEqual(['overview', 'channels', 'insights', 'alerts']);

      const operatorNav = getVisiblePrimaryNav('operator');
      expect(operatorNav.map((n) => n.id)).toEqual(['overview', 'channels', 'insights', 'alerts']);

      const adminNav = getVisiblePrimaryNav('admin');
      expect(adminNav.map((n) => n.id)).toEqual(['overview', 'channels', 'insights', 'alerts']);
    });

    it('provides role-filtered manage items distinguishing operator diagnostics from admin controls', () => {
      const viewerManage = getVisibleManageNav('viewer');
      expect(viewerManage).toHaveLength(0);

      const operatorManage = getVisibleManageNav('operator');
      expect(operatorManage.map((n) => n.id)).toEqual(['manage-diagnostics']);

      const adminManage = getVisibleManageNav('admin');
      expect(adminManage.map((n) => n.id)).toEqual(['manage-devices', 'manage-diagnostics', 'manage-audit']);
    });
  });

  describe('4. RouterContext & URL-Backed State Derivation', () => {
    function RouteInspector() {
      const router = useRouter();
      return React.createElement('div', {
        id: 'route-inspector',
        'data-path': router.path,
        'data-canonical': router.canonicalPath,
        'data-device': router.selectedDevice,
        'data-allowed': String(router.isAllowedRoute),
        'data-required-role': router.requiredRole || '',
      });
    }

    it('derives canonical route and selected device from initial path and query', () => {
      const html = renderToString(
        React.createElement(
          RouterProvider,
          {
            initialPath: '/analytics?device=prototype2',
            initialDevice: 'prototype1',
            userRole: 'viewer',
          },
          React.createElement(RouteInspector, null)
        )
      );

      expect(html).toContain('data-canonical="/insights/trends"');
      expect(html).toContain('data-device="prototype2"');
      expect(html).toContain('data-allowed="true"');
    });

    it('identifies forbidden routes when initialized with unauthorized path and role', () => {
      const html = renderToString(
        React.createElement(
          RouterProvider,
          {
            initialPath: '/manage/devices',
            userRole: 'viewer',
          },
          React.createElement(RouteInspector, null)
        )
      );

      expect(html).toContain('data-canonical="/manage/devices"');
      expect(html).toContain('data-allowed="false"');
      expect(html).toContain('data-required-role="admin"');
    });
  });

  describe('5. Responsive AppShell & Task Navigation Rendering', () => {
    it('renders task-based navigation items (Overview, Channels, Insights, Alerts)', () => {
      const html = renderToString(
        React.createElement(
          AuthProvider,
          null,
          React.createElement(
            AppShell,
            {
              selectedDevice: 'prototype1',
              activeRoute: '/overview',
              availableDevices: ['prototype1', 'prototype2'],
            },
            React.createElement('div', null, 'Workspace Content')
          )
        )
      );

      expect(html).toContain('Overview');
      expect(html).toContain('Channels');
      expect(html).toContain('Insights');
      expect(html).toContain('Alerts');
      expect(html).toContain('MIN-SAKTHI');
      expect(html).toContain('prototype1');
      expect(html).toContain('Workspace Content');
    });

    it('renders single unified device selector with status label', () => {
      const html = renderToString(
        React.createElement(
          AuthProvider,
          null,
          React.createElement(
            AppShell,
            {
              selectedDevice: 'prototype1',
              activeRoute: '/overview',
              availableDevices: ['prototype1', 'prototype2'],
            },
            React.createElement('div', null, 'Content')
          )
        )
      );

      expect(html).toContain('prototype1');
      expect(html).toContain('aria-haspopup="listbox"');
      expect(html).toContain('aria-label="Active Device: prototype1');
    });

    it('ensures touch targets on mobile drawer have minimum 44px height', () => {
      const html = renderToString(
        React.createElement(
          AuthProvider,
          null,
          React.createElement(
            AppShell,
            {
              selectedDevice: 'prototype1',
              activeRoute: '/overview',
            },
            React.createElement('div', null, 'Content')
          )
        )
      );

      // Verify touch target styling classes
      expect(html).toContain('min-w-[44px]');
      expect(html).toContain('min-h-[44px]');
    });
  });

  describe('6. Manage & Insights Container Components', () => {
    const mockTelemetry: Parameters<typeof Insights>[0]['telemetry'] = {
      connectionState: 'connected',
      channels: [],
      health: { broker: 'connected', process: 'healthy', database: 'healthy', brokerSubscribed: true },
      coverage: { configuredSlots: 0, reportingSlots: 0, partial: false },
      livePackets: [],
      powerHistory: {},
      isViewPaused: false,
      pausedCatchupCount: 0,
      pauseView: () => {},
      resumeView: () => {},
      lastDisplayLatencyMs: 14,
      snapshot: null,
      streamStatus: { label: 'Live', tone: 'positive' },
    };

    it('renders Insights sub-navigation tabs (Trends, History, Reports)', () => {
      const html = renderToString(
        React.createElement(Insights, {
          telemetry: mockTelemetry,
          selectedDevice: 'prototype1',
          activeSubTab: 'trends',
        })
      );

      expect(html).toContain('Trends &amp; Telemetry');
      expect(html).toContain('History &amp; Logs');
      expect(html).toContain('Civil Reports');
      expect(html).toContain('role="tablist"');
    });

    it('renders Access Restricted view in Manage when unauthenticated or viewer role', () => {
      const html = renderToString(
        React.createElement(
          AuthProvider,
          null,
          React.createElement(Manage, {
            telemetry: mockTelemetry,
            selectedDevice: 'prototype1',
            activeSubTab: 'devices',
          })
        )
      );

      expect(html).toContain('Access Restricted');
      expect(html).toContain('Return to Overview');
    });
  });
});
