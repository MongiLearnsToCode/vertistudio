import type { ReactNode } from 'react';

export type ContainerWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface ContainerProps {
  maxWidth?: ContainerWidth;
  padded?: boolean;
  className?: string;
  children: ReactNode;
}

const WIDTH_CLASS: Record<ContainerWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full',
};

export function Container({
  maxWidth = 'xl',
  padded = true,
  className = '',
  children,
}: ContainerProps) {
  const padCls = padded ? 'px-4' : '';
  return (
    <div className={`mx-auto w-full ${WIDTH_CLASS[maxWidth]} ${padCls} ${className}`.trim()}>
      {children}
    </div>
  );
}
