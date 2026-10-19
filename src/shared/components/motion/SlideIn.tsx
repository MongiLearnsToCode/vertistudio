import type { CSSProperties, ReactNode } from 'react';
import type { MotionDuration } from './FadeIn';

export type SlideDirection = 'up' | 'down' | 'left' | 'right';

export interface SlideInProps {
  direction?: SlideDirection;
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

const ANIMATION_NAME: Record<SlideDirection, string> = {
  up: 'motion-slide-in-up',
  down: 'motion-slide-in-down',
  left: 'motion-slide-in-left',
  right: 'motion-slide-in-right',
};

export function SlideIn({
  direction = 'up',
  duration = 'normal',
  delay = 0,
  className = '',
  children,
}: SlideInProps) {
  const style: CSSProperties = {
    animationName: ANIMATION_NAME[direction],
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
