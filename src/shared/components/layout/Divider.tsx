export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Divider({ orientation = 'horizontal', className = '' }: DividerProps) {
  const orientationCls =
    orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full';
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={`bg-border ${orientationCls} ${className}`.trim()}
    />
  );
}
