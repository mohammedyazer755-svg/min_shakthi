import React from 'react';

export interface ElectricBrandMarkProps {
  size?: number;
  className?: string;
}

export const ElectricBrandMark: React.FC<ElectricBrandMarkProps> = ({ size = 28, className = '' }) => {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        border: '1px solid rgba(255,255,255,0.4)',
        background: '#000000',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      <svg
        width={Math.round(size * 0.5)}
        height={Math.round(size * 0.64)}
        viewBox="0 0 14 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8.5 1L1 10.5H7L5.5 17L13 7.5H7.5L8.5 1Z"
          fill="#C8A96E"
          stroke="#C8A96E"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default ElectricBrandMark;
