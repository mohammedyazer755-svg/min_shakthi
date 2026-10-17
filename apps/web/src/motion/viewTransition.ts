import { getEffectiveReducedMotion } from './motionPreference';
import { flushSync } from 'react-dom';

let activeTransitionId = 0;
let activeTransition: { skipTransition: () => void } | undefined;

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
  const transitionId = ++activeTransitionId;
  activeTransition?.skipTransition();
  activeTransition = undefined;
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
      let result: void | Promise<void> = undefined;
      flushSync(() => { result = updateFn(); });
      await result;
    });
    activeTransition = transition;
    void transition.ready.catch(() => {});
    void transition.finished.catch(() => {}).then(() => {
      if (activeTransition === transition) activeTransition = undefined;
    });
    await transition.updateCallbackDone.catch(() => {});
  } catch {
    // If startViewTransition failed or was aborted, ensure updateFn runs
    if (transitionId === activeTransitionId) {
      await updateFn();
    }
  }
}
