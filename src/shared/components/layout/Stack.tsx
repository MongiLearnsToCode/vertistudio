import type { ReactNode } from 'react';

export type StackGap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type StackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type StackJustify =
  | 'start'
  | 'center'
  | 'end'
  | 'between'
  | 'around'
  | 'evenly';

export interface StackProps {
  direction?: 'row' | 'col';
  gap?: StackGap;
  align?: StackAlign;
  justify?: StackJustify;
  wrap?: boolean;
  className?: string;
  children: ReactNode;
}

const GAP_CLASS: Record<StackGap, string> = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

const ALIGN_CLASS: Record<StackAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
};

const JUSTIFY_CLASS: Record<StackJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

export function Stack({
  direction = 'col',
  gap = 'sm',
  align,
  justify,
  wrap = false,
  className = '',
  children,
}: StackProps) {
  const dirCls = direction === 'row' ? 'flex-row' : 'flex-col';
  const alignCls = align ? ALIGN_CLASS[align] : '';
  const justifyCls = justify ? JUSTIFY_CLASS[justify] : '';
  const wrapCls = wrap ? 'flex-wrap' : '';
  return (
    <div
      className={`flex ${dirCls} ${GAP_CLASS[gap]} ${alignCls} ${justifyCls} ${wrapCls} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
