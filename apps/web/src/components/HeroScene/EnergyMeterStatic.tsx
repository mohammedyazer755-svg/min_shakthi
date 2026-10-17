import React from 'react';

export interface EnergyMeterStaticProps {
  className?: string;
  size?: number;
}

export const EnergyMeterStatic: React.FC<EnergyMeterStaticProps> = ({
  className = '',
  size = 380,
}) => {
  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`.trim()}
      style={{ width: '100%', maxWidth: size, aspectRatio: '1/1' }}
      aria-label="MIN-SAKTHI Precision Energy Meter Graphic"
      role="img"
    >
      <svg
        viewBox="0 0 380 380"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-2xl"
      >
        <desc>NON-OPERATIONAL ILLUSTRATION: 50.00 Hz Pure Sine Grid Reference (Deterministic harmonic model)</desc>
        <defs>
          {/* Chassis Outer Gradient */}
          <linearGradient id="chassisGrad" x1="40" y1="20" x2="340" y2="360" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1a1a24" />
            <stop offset="50%" stopColor="#0d0d12" />
            <stop offset="100%" stopColor="#050508" />
          </linearGradient>

          {/* Brass Bezel Gradient */}
          <linearGradient id="brassBezel" x1="90" y1="60" x2="290" y2="300" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ecd49a" />
            <stop offset="35%" stopColor="#c8a96e" />
            <stop offset="70%" stopColor="#7a5e2a" />
            <stop offset="100%" stopColor="#c8a96e" />
          </linearGradient>

          {/* Dark Dial Face */}
          <radialGradient id="dialFace" cx="190" cy="180" r="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#14141c" />
            <stop offset="85%" stopColor="#09090d" />
            <stop offset="100%" stopColor="#040406" />
          </radialGradient>

          {/* Needle Glow */}
          <filter id="needleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#c8a96e" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Chassis Outer Box with Beveled Corners */}
        <rect
          x="50"
          y="40"
          width="280"
          height="300"
          rx="24"
          fill="url(#chassisGrad)"
          stroke="rgba(255, 255, 255, 0.14)"
          strokeWidth="1.5"
        />

        {/* Inner Panel Border */}
        <rect
          x="66"
          y="56"
          width="248"
          height="268"
          rx="16"
          fill="none"
          stroke="rgba(200, 169, 110, 0.25)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Brass Circular Bezel */}
        <circle
          cx="190"
          cy="180"
          r="96"
          fill="none"
          stroke="url(#brassBezel)"
          strokeWidth="3.5"
        />

        {/* Dark Dial Center */}
        <circle
          cx="190"
          cy="180"
          r="92"
          fill="url(#dialFace)"
          stroke="rgba(0, 0, 0, 0.8)"
          strokeWidth="2"
        />

        {/* Dial Scale Tick Marks */}
        {Array.from({ length: 25 }, (_, i) => {
          const angle = -135 + (i * 270) / 24;
          const rad = (angle * Math.PI) / 180;
          const isMajor = i % 4 === 0;
          const r1 = 86;
          const r2 = isMajor ? 74 : 80;
          const x1 = 190 + r1 * Math.cos(rad);
          const y1 = 180 + r1 * Math.sin(rad);
          const x2 = 190 + r2 * Math.cos(rad);
          const y2 = 180 + r2 * Math.sin(rad);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isMajor ? '#c8a96e' : 'rgba(255, 255, 255, 0.25)'}
              strokeWidth={isMajor ? 2 : 1}
              strokeLinecap="round"
            />
          );
        })}

        {/* Arc Track */}
        <path
          d="M 125 245 A 86 86 0 1 1 255 245"
          fill="none"
          stroke="rgba(200, 169, 110, 0.4)"
          strokeWidth="2"
          strokeDasharray="2 3"
        />

        {/* Dial Center Boss */}
        <circle cx="190" cy="180" r="14" fill="#1c1c24" stroke="#c8a96e" strokeWidth="2" />
        <circle cx="190" cy="180" r="6" fill="#c8a96e" />

        {/* Golden Meter Needle */}
        <g filter="url(#needleGlow)">
          <line
            x1="190"
            y1="180"
            x2="235"
            y2="130"
            stroke="#c8a96e"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            x1="190"
            y1="180"
            x2="175"
            y2="198"
            stroke="#7a5e2a"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </g>

        {/* Digital Sub-display Window */}
        <rect
          x="145"
          y="226"
          width="90"
          height="22"
          rx="4"
          fill="#000000"
          stroke="rgba(200, 169, 110, 0.35)"
          strokeWidth="1"
        />
        <text
          x="190"
          y="241"
          textAnchor="middle"
          fill="#c8a96e"
          fontFamily="monospace"
          fontSize="11"
          fontWeight="bold"
          letterSpacing="0.1em"
        >
          50.00 Hz
        </text>

        {/* Model & Spec Label */}
        <text
          x="190"
          y="108"
          textAnchor="middle"
          fill="rgba(255, 255, 255, 0.45)"
          fontFamily="sans-serif"
          fontSize="8.5"
          fontWeight="700"
          letterSpacing="0.15em"
        >
          MIN-SAKTHI · 3-PHASE PRECISION
        </text>

        {/* Terminal Connection Lugs (Bottom) */}
        <rect x="100" y="338" width="28" height="14" rx="3" fill="#c8a96e" opacity="0.85" />
        <rect x="146" y="338" width="28" height="14" rx="3" fill="#c8a96e" opacity="0.85" />
        <rect x="206" y="338" width="28" height="14" rx="3" fill="#c8a96e" opacity="0.85" />
        <rect x="252" y="338" width="28" height="14" rx="3" fill="#c8a96e" opacity="0.85" />

        {/* Screws on Corners */}
        <circle cx="68" cy="58" r="4" fill="#242430" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <circle cx="312" cy="58" r="4" fill="#242430" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <circle cx="68" cy="322" r="4" fill="#242430" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <circle cx="312" cy="322" r="4" fill="#242430" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      </svg>
    </div>
  );
};

export default EnergyMeterStatic;
