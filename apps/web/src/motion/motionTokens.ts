/**
 * MIN-SAKTHI V2 Centralized Motion Tokens
 * Specification: Section 5 of docs/EXPERIENCE_REDESIGN_PLAN.md
 */

export const MOTION_DURATIONS = {
  /** 120–160ms: Hover, focus, button press, chart series emphasis */
  fast: 140,
  /** 180–240ms: Workspace page change, modal, drawer, tabs */
  normal: 200,
  /** 280–360ms: Landing to workspace reveal / auth handoff */
  auth: 320,
  /** 150–200ms: Local feedback for save, error, alert acknowledgement */
  feedback: 180,
} as const;

export const MOTION_EASINGS = {
  /** Smooth deceleration curve for entrances and state changes */
  standard: 'cubic-bezier(0.2, 0.0, 0, 1.0)',
  /** Quick responsive ease-out for immediate interactions */
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  /** Subtle ease-in for exits */
  in: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

export const MOTION_TRANSFORMS = {
  /** Press scale down to 0.99 per specification */
  pressScale: 0.99,
  /** Clickable card lifts up to 2px on hover */
  liftY: -2,
  /** Page entrance subtle vertical shift */
  pageShiftY: 8,
} as const;
