import type { LucideIcon, LucideProps } from 'lucide-react';

const DEFAULT_SIZE = 18;
const DEFAULT_STROKE_WIDTH = 1.5;

export interface IconProps extends Omit<LucideProps, 'ref'> {
  icon: LucideIcon;
}

export function Icon({
  icon: Component,
  size = DEFAULT_SIZE,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  ...rest
}: IconProps) {
  return <Component size={size} strokeWidth={strokeWidth} {...rest} />;
}
