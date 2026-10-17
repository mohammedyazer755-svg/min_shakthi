import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { EnergyMeterStatic } from '../../apps/web/src/components/HeroScene/EnergyMeterStatic.js';
import { HeroScene } from '../../apps/web/src/components/HeroScene/index.js';
import { LandingPage } from '../../apps/web/src/pages/LandingPage.js';
import { AuthProvider } from '../../apps/web/src/auth/AuthContext.js';

describe('Phase 5: Refined Dark Landing & 3D Hero Entrance', () => {
  describe('EnergyMeterStatic Component', () => {
    it('renders vector SVG with accessibility attributes and precise geometry', () => {
      const html = renderToString(React.createElement(EnergyMeterStatic, { size: 380, className: 'custom-meter' }));

      // Accessible role and label
      expect(html).toContain('role="img"');
      expect(html).toContain('aria-label="MIN-SAKTHI Precision Energy Meter Graphic"');
      expect(html).toContain('custom-meter');

      // SVG root and viewBox
      expect(html).toContain('<svg');
      expect(html).toContain('viewBox="0 0 380 380"');

      // Gradients for warm-metal Blinn-Phong style
      expect(html).toContain('id="chassisGrad"');
      expect(html).toContain('id="brassBezel"');
      expect(html).toContain('id="dialFace"');
      expect(html).toContain('id="needleGlow"');

      // Dial face and needle elements
      expect(html).toContain('cx="190"');
      expect(html).toContain('cy="180"');
      expect(html).toContain('#c8a96e'); // MIN-SAKTHI signature warm gold
      expect(html).toContain('50.00 Hz');
      expect(html).toContain('MIN-SAKTHI · 3-PHASE PRECISION');
    });

    it('respects custom size prop', () => {
      const html = renderToString(React.createElement(EnergyMeterStatic, { size: 240 }));
      expect(html).toContain('max-width:240px');
    });
  });

  describe('HeroScene Component', () => {
    it('renders static SVG fallback under server or forceStatic conditions', () => {
      const html = renderToString(React.createElement(HeroScene, { forceStatic: true, size: 350 }));
      expect(html).toContain('<svg');
      expect(html).toContain('viewBox="0 0 380 380"');
      expect(html).toContain('aria-label="MIN-SAKTHI Precision Energy Meter Graphic"');
    });
  });

  describe('LandingPage Structure & Editorial Content', () => {
    it('renders concise editorial hero headline and primary CTA', () => {
      const html = renderToString(
        React.createElement(AuthProvider, null,
          React.createElement(LandingPage, null)
        )
      );

      // Hero headline
      expect(html).toContain('Measure every watt');
      expect(html).toContain('before the');
      expect(html).toContain('grid commits.');

      // System status indicator
      expect(html).toContain('Secure access');
      expect(html).toContain('SUB-SECOND EDGE TELEMETRY');

      // Primary buttons
      expect(html).toContain('Live Stream');
      expect(html).toContain('Sign In');
    });

    it('renders exactly three engineering benefit pillars', () => {
      const html = renderToString(
        React.createElement(AuthProvider, null,
          React.createElement(LandingPage, null)
        )
      );

      // 3 Benefits
      expect(html).toContain('01 / PRECISION');
      expect(html).toContain('Sub-Second Edge Precision');
      expect(html).toContain('02 / REPORTING');
      expect(html).toContain('Auditable Civil Reporting');
      expect(html).toContain('03 / RELIABILITY');
      expect(html).toContain('Resilient Mission Control');
    });

    it('presents an honest non-operational preview with clear disclaimers', () => {
      const html = renderToString(
        React.createElement(AuthProvider, null,
          React.createElement(LandingPage, null)
        )
      );

      // Non-operational disclaimer badge
      expect(html).toContain('NON-OPERATIONAL WORKSPACE PREVIEW');
      expect(html).toContain('Sign in to view real-time site telemetry');

      // Channel slots with non-operational placeholder values
      expect(html).toContain('CH01');
      expect(html).toContain('CH05');
      expect(html).toContain('Sign in to view');
      expect(html).toContain('— V');
      expect(html).toContain('— A');
    });

    it('removes public role/email shortcuts from footer and body', () => {
      const html = renderToString(
        React.createElement(AuthProvider, null,
          React.createElement(LandingPage, null)
        )
      );

      // Pre-Phase 5 test identity shortcuts in the footer must be absent
      expect(html).not.toContain('Quick Sign-In (Dev)');
      expect(html).not.toContain('admin@minsakthi.local</span>');
      expect(html).not.toContain('operator@minsakthi.local</span>');
      expect(html).not.toContain('viewer@minsakthi.local</span>');

      // Footer clean copy
      expect(html).toContain('Sessions authenticated via secure HttpOnly tokens');
    });
  });

  describe('3D Asset & Bundle Isolation', () => {
    it('verifies that authenticated workspace modules do NOT import HeroScene or OGL directly', () => {
      const workspaceFiles = [
        'apps/web/src/components/AppShell.tsx',
        'apps/web/src/pages/Overview.tsx',
        'apps/web/src/pages/ChannelAnalytics.tsx',
        'apps/web/src/pages/OverallAnalytics.tsx',
        'apps/web/src/pages/History.tsx',
        'apps/web/src/pages/Reports.tsx',
        'apps/web/src/pages/Alerts.tsx',
        'apps/web/src/pages/Devices.tsx',
        'apps/web/src/pages/Settings.tsx',
      ];

      for (const relPath of workspaceFiles) {
        const fullPath = path.resolve(process.cwd(), relPath);
        const content = fs.readFileSync(fullPath, 'utf8');

        expect(content).not.toContain('HeroScene');
        expect(content).not.toContain('EnergyMeter3D');
        expect(content).not.toContain("from 'ogl'");
        expect(content).not.toContain('from "ogl"');
      }
    });

    it('verifies EnergyMeter3D implements pause controls, DPR capping, and WebGL cleanup', () => {
      const meter3DPath = path.resolve(process.cwd(), 'apps/web/src/components/HeroScene/EnergyMeter3D.tsx');
      const content = fs.readFileSync(meter3DPath, 'utf8');

      // Pause toggle control
      expect(content).toContain('isPaused');
      expect(content).toContain('setIsPaused');
      expect(content).toContain('Pause 3D animation');
      expect(content).toContain('Resume 3D animation');

      // DPR capping
      expect(content).toContain('Math.min(window.devicePixelRatio');
      expect(content).toContain('1.5'); // capped at 1.5 on desktop

      // Lifecycle & Context Loss
      expect(content).toContain('webglcontextlost');
      expect(content).toContain('setHasContextError(true)');
      expect(content).toContain('loseContext');
      expect(content).toContain('IntersectionObserver');
      expect(content).toContain('visibilitychange');

      // Reduced motion & coarse pointer detection
      expect(content).toContain('getEffectiveReducedMotion');
      expect(content).toContain('pointer: coarse');
    });
  });
});
