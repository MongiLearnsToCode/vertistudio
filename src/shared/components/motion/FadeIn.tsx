import type { CSSProperties, ReactNode } from 'react';

export type MotionDuration = 'fast' | 'normal' | 'slow';

export interface FadeInProps {
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

export function FadeIn({ duration = 'normal', delay = 0, className = '', children }: FadeInProps) {
  const style: CSSProperties = {
    animationName: 'motion-fade-in',
    animationDuration: DURATION_VAR[duration],
    animationTimingFunction: 'var(--ease-standard)',
    animationFillMode: 'both',
    animationDelay: delay > 0 ? `${delay}ms` : undefined,
  };
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
