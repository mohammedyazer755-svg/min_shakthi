import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  style,
  ...rest
}) => {
  const paddingStyle = {
    none: {},
    sm: { padding: '12px' },
    md: { padding: '16px 20px' },
    lg: { padding: '24px 28px' },
  }[padding];

  return (
    <div
      className={className}
      style={{
        background: 'var(--dark-surface)',
        border: '1px solid var(--dark-border)',
        borderRadius: '12px',
        ...paddingStyle,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};
