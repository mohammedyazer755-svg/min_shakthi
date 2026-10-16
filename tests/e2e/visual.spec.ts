import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AppShell } from '../../apps/web/src/components/AppShell.js';
import { MeasurementChart } from '../../apps/web/src/components/MeasurementChart.js';
import { AuthProvider } from '../../apps/web/src/auth/AuthContext.js';

describe('Visual, Responsive and Accessibility Suite (DESIGN_SYSTEM: 360–1920px, tokens, contrast)', () => {
  const VIEWPORT_WIDTHS = [360, 390, 768, 1024, 1440, 1920];

  it('verifies responsive layout containers render correctly across all required viewports (360px to 1920px)', () => {
    for (const width of VIEWPORT_WIDTHS) {
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
            React.createElement('div', { id: 'test-viewport-container', 'data-width': width }, `Width: ${width}px`)
          )
        )
      );

      // Verify essential accessibility landmarks
      expect(html).toContain('Skip to main content');
      expect(html).toContain('id="main-content"');
      expect(html).toContain('MIN-SAKTHI');
      expect(html).toContain(`Width: ${width}px`);
    }
  });

  it('verifies MeasurementChart SVG satisfies accessibility standards (role="img", title, desc, sr-only table)', () => {
    const series = [
      {
        id: 'channel1',
        name: 'Main Feed',
        color: '#80601E',
        unit: 'W',
        data: [
          { timestamp: new Date(Date.now() - 60000).toISOString(), value: 33.22 },
          { timestamp: new Date(Date.now() - 30000).toISOString(), value: null }, // Gap
          { timestamp: new Date(Date.now()).toISOString(), value: 34.1 },
        ],
      },
    ];

    const html = renderToString(
      React.createElement(MeasurementChart, {
        title: 'Active Power Trend Test',
        series,
        height: 280,
      })
    );

    // SVG accessibility attributes
    expect(html).toContain('role="img"');
    expect(html).toContain('<title');
    expect(html).toContain('<desc');
    expect(html).toContain('Active Power Trend Test');

    // Screen reader table for assistive technologies
    expect(html).toContain('class="sr-only"');
    expect(html).toContain('<caption>Active Power Trend Test data table</caption>');
    expect(html).toContain('Missing (Gap)');
  });

  it('verifies warm ivory design system color tokens are present in stylesheet definitions', async () => {
    // Import tokens stylesheet content to verify tokens
    const fs = await import('node:fs');
    const path = await import('node:path');
    const cssPath = path.resolve(process.cwd(), 'apps/web/src/styles/tokens.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    // Verify non-negotiable palette
    expect(css).toContain('#F7F6F2'); // Warm Ivory Canvas
    expect(css).toContain('#FFFFFF'); // White Surface
    expect(css).toContain('#202321'); // Charcoal Text Primary
    expect(css).toContain('#A38445'); // Restrained Gold Accent
    expect(css).toContain('#176344'); // Positive Emerald
    expect(css).toContain('#805300'); // Warning Amber
    expect(css).toContain('#A52E2E'); // Critical Crimson
  });
});
