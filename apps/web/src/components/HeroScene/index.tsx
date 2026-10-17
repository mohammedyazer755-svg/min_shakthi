import React, { Suspense, lazy } from 'react';
import { EnergyMeterStatic } from './EnergyMeterStatic';
import type { EnergyMeter3DProps } from './EnergyMeter3D';

// Lazy load the 3D WebGL scene to keep authenticated startup bundle lightweight
const LazyEnergyMeter3D = lazy(() => import('./EnergyMeter3D'));

export interface HeroSceneProps extends EnergyMeter3DProps {
  forceStatic?: boolean;
}

export const HeroScene: React.FC<HeroSceneProps> = ({
  forceStatic = false,
  size = 380,
  className = '',
}) => {
  if (forceStatic || typeof window === 'undefined') {
    return <EnergyMeterStatic size={size} className={className} />;
  }

  return (
    <Suspense fallback={<EnergyMeterStatic size={size} className={className} />}>
      <LazyEnergyMeter3D size={size} className={className} />
    </Suspense>
  );
};

export { EnergyMeterStatic } from './EnergyMeterStatic';
export type { EnergyMeterStaticProps } from './EnergyMeterStatic';
export default HeroScene;
