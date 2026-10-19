import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`bg-app-surface rounded-md ${className}`.trim()}
      style={{ border: '0.5px solid var(--color-border)' }}
    >
      {children}
    </div>
  );
}
