import type { ReactNode } from 'react';
import type { StackGap } from './Stack';

export type GridCols = 1 | 2 | 3 | 4 | 5 | 6 | 12;

export interface GridProps {
  cols?: GridCols;
  gap?: StackGap;
  className?: string;
  children: ReactNode;
}

const COLS_CLASS: Record<GridCols, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  12: 'grid-cols-12',
};

const GAP_CLASS: Record<StackGap, string> = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

export function Grid({ cols = 2, gap = 'sm', className = '', children }: GridProps) {
  return (
    <div className={`grid ${COLS_CLASS[cols]} ${GAP_CLASS[gap]} ${className}`.trim()}>
      {children}
    </div>
  );
}
