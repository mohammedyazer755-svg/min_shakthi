import { getEffectiveReducedMotion } from './motionPreference';

let activeTransitionId = 0;

export interface ViewTransitionOptions {
  /** Skip transition even if supported */
  skip?: boolean;
}

/**
 * Executes an update function wrapped in a native View Transition if supported.
 * Falls back immediately to invoking the callback if:
 * 1. document.startViewTransition is not supported
 * 2. Reduced motion is active (OS or user preference)
 * 3. Environment is SSR
 */
export async function safeViewTransition(
  updateFn: () => void | Promise<void>,
  options?: ViewTransitionOptions
): Promise<void> {
  // If SSR or explicitly skipped or reduced motion active, execute immediately
  if (
    typeof document === 'undefined' ||
    options?.skip ||
    getEffectiveReducedMotion() ||
    typeof (document as unknown as { startViewTransition?: unknown }).startViewTransition !== 'function'
  ) {
    await updateFn();
    return;
  }

  const transitionId = ++activeTransitionId;

  try {
    const doc = document as unknown as {
      startViewTransition: (callback: () => Promise<void> | void) => {
        finished: Promise<void>;
        ready: Promise<void>;
        updateCallbackDone: Promise<void>;
        skipTransition: () => void;
      };
    };

    const transition = doc.startViewTransition(async () => {
      // If a newer navigation occurred, don't execute stale callback
      if (transitionId !== activeTransitionId) {
        return;
      }
      await updateFn();
    });

    await transition.updateCallbackDone.catch(() => {});
  } catch {
    // If startViewTransition failed or was aborted, ensure updateFn runs
    if (transitionId === activeTransitionId) {
      await updateFn();
    }
  }
}
