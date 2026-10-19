import type { CSSProperties, ReactNode } from 'react';
import type { MotionDuration } from './FadeIn';

export interface ScaleInProps {
  duration?: MotionDuration;
  delay?: number;
  className?: string;
  children: ReactNode;
}

const DURATION_VAR: Record<MotionDuration, string> = {
  fast: 'var(--duration-fast)',
  normal: 'var(--duration-normal)',
  slow: 'var(--duration-slow)',
};

export function ScaleIn({
  duration = 'normal',
  delay = 0,
  className = '',
  children,
}: ScaleInProps) {
  const style: CSSProperties = {
    animationName: 'motion-scale-in',
    animationDuration: DURATION_VAR[duration],
    animationTimingFunction: 'var(--ease-emphasis)',
    animationFillMode: 'both',
    animationDelay: delay > 0 ? `${delay}ms` : undefined,
  };
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
