import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '').trim();
  const bigint = parseInt(cleanHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
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

describe('Design System Tokens and WCAG Contrast Verification', () => {
  const tokensPath = path.resolve(__dirname, '../../apps/web/src/styles/tokens.css');
  const tokensContent = fs.readFileSync(tokensPath, 'utf-8');

  it('declares exact required token values in tokens.css', () => {
    expect(tokensContent).toContain('#F7F6F2'); // Warm Ivory Canvas
    expect(tokensContent).toContain('#FFFFFF'); // Surface
    expect(tokensContent).toContain('#202321'); // Charcoal Primary Text
    expect(tokensContent).toContain('#5D625D'); // Secondary Text
    expect(tokensContent).toContain('#DDDCD5'); // Border
    expect(tokensContent).toContain('#777B72'); // Strong Border
    expect(tokensContent).toContain('#A38445'); // Accent Gold
    expect(tokensContent).toContain('#725719'); // Accent Gold Text
    expect(tokensContent).toContain('#176344'); // Positive
    expect(tokensContent).toContain('#805300'); // Warning
    expect(tokensContent).toContain('#A52E2E'); // Critical
  });

  it('verifies primary text (#202321) on canvas (#F7F6F2) passes WCAG AA and AAA (>= 7:1)', () => {
    const ratio = getContrastRatio('#F7F6F2', '#202321');
    expect(ratio).toBeGreaterThan(7.0);
  });

  it('verifies secondary text (#5D625D) on canvas (#F7F6F2) passes WCAG AA (>= 4.5:1)', () => {
    const ratio = getContrastRatio('#F7F6F2', '#5D625D');
    expect(ratio).toBeGreaterThan(4.5);
  });

  it('verifies primary button white text (#FFFFFF) on charcoal (#202321) passes WCAG AAA (>= 7:1)', () => {
    const ratio = getContrastRatio('#202321', '#FFFFFF');
    expect(ratio).toBeGreaterThan(7.0);
  });

  it('verifies restrained gold small text (#725719) on ivory (#F7F6F2) passes WCAG AA (>= 4.5:1)', () => {
    const ratio = getContrastRatio('#F7F6F2', '#725719');
    expect(ratio).toBeGreaterThan(4.5);
  });

  it('verifies status colors on white surface pass WCAG AA (>= 4.5:1)', () => {
    expect(getContrastRatio('#FFFFFF', '#176344')).toBeGreaterThan(4.5); // Positive
    expect(getContrastRatio('#FFFFFF', '#805300')).toBeGreaterThan(4.5); // Warning
    expect(getContrastRatio('#FFFFFF', '#A52E2E')).toBeGreaterThan(4.5); // Critical
  });
});
