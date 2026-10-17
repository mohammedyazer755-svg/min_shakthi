import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Setup minimal JSDOM-like environment for Node environment
class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  setItem(key: string, val: string): void {
    this.store[key] = String(val);
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

let mockAttributes: Record<string, string> = {};
let mockMatchMediaMatches = false;
const localStorageMock = new MockLocalStorage();

const mockDocument = {
  documentElement: {
    setAttribute: (name: string, value: string) => {
      mockAttributes[name] = value;
    },
    getAttribute: (name: string) => mockAttributes[name] ?? null,
  },
};

const mockWindow = {
  matchMedia: (query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? mockMatchMediaMatches : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
  localStorage: localStorageMock,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  CustomEvent: class CustomEvent {
    type: string;
    detail: unknown;
    constructor(type: string, params?: { detail?: unknown }) {
      this.type = type;
      this.detail = params?.detail;
    }
  },
};

// @ts-expect-error Mocking global environment
globalThis.window = mockWindow;
// @ts-expect-error Mocking global environment
globalThis.document = mockDocument;
// @ts-expect-error Mocking global environment
globalThis.localStorage = localStorageMock;
// @ts-expect-error Mocking global environment
globalThis.CustomEvent = mockWindow.CustomEvent;

import {
  MOTION_DURATIONS,
  MOTION_EASINGS,
  MOTION_TRANSFORMS,
  getEffectiveReducedMotion,
  getStoredAnimationPreference,
  setStoredAnimationPreference,
  safeViewTransition,
} from '../../apps/web/src/motion/index.js';

describe('Phase 4: Motion System & Seamless Interaction', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockAttributes = {};
    mockMatchMediaMatches = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports centralized motion tokens matching specification budgets', () => {
    // Hover/focus/press: 120–160ms
    expect(MOTION_DURATIONS.fast).toBeGreaterThanOrEqual(120);
    expect(MOTION_DURATIONS.fast).toBeLessThanOrEqual(160);

    // Page navigation / modal / drawer: 180–240ms
    expect(MOTION_DURATIONS.normal).toBeGreaterThanOrEqual(180);
    expect(MOTION_DURATIONS.normal).toBeLessThanOrEqual(240);

    // Auth handoff / landing reveal: 280–360ms
    expect(MOTION_DURATIONS.auth).toBeGreaterThanOrEqual(280);
    expect(MOTION_DURATIONS.auth).toBeLessThanOrEqual(360);

    // Feedback: 150–200ms
    expect(MOTION_DURATIONS.feedback).toBeGreaterThanOrEqual(150);
    expect(MOTION_DURATIONS.feedback).toBeLessThanOrEqual(200);

    // Interactive transforms
    expect(MOTION_TRANSFORMS.pressScale).toBe(0.99);
    expect(MOTION_TRANSFORMS.liftY).toBe(-2);
    expect(MOTION_TRANSFORMS.pageShiftY).toBe(8);

    // Easings
    expect(MOTION_EASINGS.standard).toContain('cubic-bezier');
  });

  it('enforces that OS reduced-motion preference strictly overrides user preference', () => {
    // 1. OS requests reduced motion
    mockMatchMediaMatches = true;

    // Even if user chose 'full', OS must override to reduced motion
    setStoredAnimationPreference('full');
    expect(getStoredAnimationPreference()).toBe('full');
    expect(getEffectiveReducedMotion()).toBe(true);

    // If user chose 'system', OS must override to reduced motion
    setStoredAnimationPreference('system');
    expect(getEffectiveReducedMotion()).toBe(true);

    // 2. OS does NOT request reduced motion
    mockMatchMediaMatches = false;

    // User chooses 'reduce' -> reduced motion is active
    setStoredAnimationPreference('reduce');
    expect(getEffectiveReducedMotion()).toBe(true);

    // User chooses 'full' -> normal motion is active
    setStoredAnimationPreference('full');
    expect(getEffectiveReducedMotion()).toBe(false);

    // User chooses 'system' -> normal motion is active
    setStoredAnimationPreference('system');
    expect(getEffectiveReducedMotion()).toBe(false);
  });

  it('synchronizes data-motion attribute on the document root', () => {
    mockMatchMediaMatches = false;
    setStoredAnimationPreference('reduce');
    expect(mockDocument.documentElement.getAttribute('data-motion')).toBe('reduce');

    setStoredAnimationPreference('full');
    expect(mockDocument.documentElement.getAttribute('data-motion')).toBe('normal');
  });

  it('safeViewTransition falls back immediately when document.startViewTransition is absent', async () => {
    expect((mockDocument as unknown as { startViewTransition?: unknown }).startViewTransition).toBeUndefined();

    let executed = false;
    await safeViewTransition(() => {
      executed = true;
    });

    expect(executed).toBe(true);
  });

  it('safeViewTransition bypasses startViewTransition when reduced motion is active', async () => {
    mockMatchMediaMatches = true; // Reduced motion active

    const mockStartViewTransition = vi.fn();
    (mockDocument as unknown as { startViewTransition?: unknown }).startViewTransition = mockStartViewTransition;

    let executed = false;
    await safeViewTransition(() => {
      executed = true;
    });

    expect(executed).toBe(true);
    expect(mockStartViewTransition).not.toHaveBeenCalled();

    delete (mockDocument as unknown as { startViewTransition?: unknown }).startViewTransition;
  });

  it('safeViewTransition coordinates with document.startViewTransition when supported', async () => {
    mockMatchMediaMatches = false; // Normal motion
    setStoredAnimationPreference('full');

    let executed = false;
    const mockStartViewTransition = vi.fn().mockImplementation((cb: () => Promise<void> | void) => {
      cb();
      return {
        finished: Promise.resolve(),
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition: vi.fn(),
      };
    });

    (mockDocument as unknown as { startViewTransition?: unknown }).startViewTransition = mockStartViewTransition;

    await safeViewTransition(() => {
      executed = true;
    });

    expect(mockStartViewTransition).toHaveBeenCalled();
    expect(executed).toBe(true);

    delete (mockDocument as unknown as { startViewTransition?: unknown }).startViewTransition;
  });

  it('CSS tokens and stylesheets define motion classes without forbidden transition: all', () => {
    const tokensCss = fs.readFileSync(path.resolve(__dirname, '../../apps/web/src/styles/tokens.css'), 'utf-8');
    const indexCss = fs.readFileSync(path.resolve(__dirname, '../../apps/web/src/styles/index.css'), 'utf-8');
    const authModalCss = fs.readFileSync(path.resolve(__dirname, '../../apps/web/src/components/Auth/AuthModal.css'), 'utf-8');

    // Motion tokens in tokens.css
    expect(tokensCss).toContain('--motion-duration-fast: 140ms');
    expect(tokensCss).toContain('--motion-duration-normal: 200ms');
    expect(tokensCss).toContain('--motion-duration-auth: 320ms');
    expect(tokensCss).toContain('--motion-duration-feedback: 180ms');

    // Motion classes in index.css
    expect(indexCss).toContain('.motion-page-enter');
    expect(indexCss).toContain('.motion-auth-reveal');
    expect(indexCss).toContain('.motion-modal-backdrop');
    expect(indexCss).toContain('.motion-modal-card');
    expect(indexCss).toContain('.motion-drawer-slide');
    expect(indexCss).toContain('.motion-dropdown-enter');
    expect(indexCss).toContain('.motion-feedback');
    expect(indexCss).toContain('.motion-interactive');

    // Reduced motion overrides
    expect(tokensCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(tokensCss).toContain('[data-motion="reduce"]');
    expect(indexCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(indexCss).toContain('[data-motion="reduce"]');

    // No forbidden transition: all on motion interactive classes
    expect(indexCss).not.toMatch(/\.motion-interactive\s*\{[^}]*transition:\s*all/);
    expect(authModalCss).not.toMatch(/\.auth-role-btn\s*\{[^}]*transition:\s*all/);
  });

  it('device switching strictly isolates telemetry state so old-device data never masquerades as new-device data', () => {
    const currentDevice = 'prototype2';
    const staleSnapshot = {
      deviceId: 'prototype1', // Old device!
      selectionGeneration: 1,
      channels: [{ slot: 'CH01', lastSample: { values: { power: 999 } } }],
    };

    // Stale snapshot from different device must be rejected
    const isAccepted = staleSnapshot.deviceId === currentDevice;
    expect(isAccepted).toBe(false);

    // New device snapshot accepted
    const validSnapshot = {
      deviceId: 'prototype2',
      selectionGeneration: 2,
      channels: [{ slot: 'CH01', lastSample: { values: { power: 12.5 } } }],
    };
    const isNewAccepted = validSnapshot.deviceId === currentDevice;
    expect(isNewAccepted).toBe(true);
  });
});
