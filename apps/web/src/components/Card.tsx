import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  isClickable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  isClickable,
  style,
  ...rest
}) => {
  const paddingStyle = {
    none: {},
    sm: { padding: '12px' },
    md: { padding: '16px 20px' },
    lg: { padding: '24px 28px' },
  }[padding];

  const clickableClass = (isClickable || Boolean(rest.onClick)) ? 'motion-clickable-card cursor-pointer' : '';

  return (
    <div
      className={`${clickableClass} ${className}`.trim()}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-card)',
        ...paddingStyle,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};
