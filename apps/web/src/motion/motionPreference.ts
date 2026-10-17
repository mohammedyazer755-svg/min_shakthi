/**
 * MIN-SAKTHI V2 Motion & Reduced-Motion Preference Management
 * Specification: OS reduced-motion preference ALWAYS takes precedence over user setting.
 */

export type AnimationPreference = 'system' | 'reduce' | 'full';

const STORAGE_KEY = 'minsakthi_animation_pref';
const EVENT_NAME = 'minsakthi:motion-change';

export function getStoredAnimationPreference(): AnimationPreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === 'reduce' || val === 'full' || val === 'system') {
      return val;
    }
  } catch {
    // LocalStorage unavailable
  }
  return 'system';
}

export function setStoredAnimationPreference(pref: AnimationPreference): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // LocalStorage unavailable
  }
  syncDataMotionAttribute();
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { preference: pref } }));
}

/**
 * Calculates whether reduced motion is effectively active.
 * RULE: OS request for less motion ALWAYS wins over user preference.
 */
export function getEffectiveReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;

  const osPrefersReduced = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  // OS takes strict precedence
  if (osPrefersReduced) {
    return true;
  }

  // Otherwise check user preference
  const userPref = getStoredAnimationPreference();
  return userPref === 'reduce';
}

export function syncDataMotionAttribute(): void {
  if (typeof document === 'undefined') return;
  const isReduced = getEffectiveReducedMotion();
  document.documentElement.setAttribute('data-motion', isReduced ? 'reduce' : 'normal');
}

// Attach listener to media query changes
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  const listener = () => {
    syncDataMotionAttribute();
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  };
  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', listener);
  } else if (typeof (mql as unknown as { addListener?: (l: () => void) => void }).addListener === 'function') {
    (mql as unknown as { addListener: (l: () => void) => void }).addListener(listener);
  }
  // Initial sync
  syncDataMotionAttribute();
}

export { EVENT_NAME as MOTION_CHANGE_EVENT };
