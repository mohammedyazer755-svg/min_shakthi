import { useState, useEffect, useCallback } from 'react';
import {
  type AnimationPreference,
  getStoredAnimationPreference,
  setStoredAnimationPreference,
  getEffectiveReducedMotion,
  MOTION_CHANGE_EVENT,
} from './motionPreference';

export function useReducedMotion() {
  const [animationPreference, setPrefState] = useState<AnimationPreference>(getStoredAnimationPreference);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(getEffectiveReducedMotion);

  useEffect(() => {
    const update = () => {
      setPrefState(getStoredAnimationPreference());
      setIsReducedMotion(getEffectiveReducedMotion());
    };

    window.addEventListener(MOTION_CHANGE_EVENT, update);
    return () => {
      window.removeEventListener(MOTION_CHANGE_EVENT, update);
    };
  }, []);

  const setPreference = useCallback((pref: AnimationPreference) => {
    setStoredAnimationPreference(pref);
    setPrefState(pref);
    setIsReducedMotion(getEffectiveReducedMotion());
  }, []);

  return {
    isReducedMotion,
    animationPreference,
    setPreference,
  };
}
