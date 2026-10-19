import type { CSSProperties } from 'react';

export type SkeletonVariant = 'text' | 'box' | 'circle';

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number | string;
  count?: number;
  className?: string;
}

const VARIANT_CLASS: Record<SkeletonVariant, string> = {
  text: 'rounded-sm',
  box: 'rounded',
  circle: 'rounded-full',
};

const VARIANT_DEFAULT_HEIGHT: Record<SkeletonVariant, string> = {
  text: '0.75rem',
  box: '4rem',
  circle: '2rem',
};

function toCss(value: number | string | undefined, fallback: string): string {
  if (value == null) return fallback;
  return typeof value === 'number' ? `${value}px` : value;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  count = 1,
  className = '',
}: SkeletonProps) {
  const style: CSSProperties = {
    width: toCss(width, '100%'),
    height: toCss(height, VARIANT_DEFAULT_HEIGHT[variant]),
  };
  if (variant === 'circle' && width != null && height == null) {
    style.height = style.width;
  }

  if (count <= 1) {
    return (
      <span
        aria-hidden="true"
        className={`block bg-app-hover animate-pulse ${VARIANT_CLASS[variant]} ${className}`.trim()}
        style={style}
      />
    );
  }

  return (
    <span aria-hidden="true" className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`block bg-app-hover animate-pulse ${VARIANT_CLASS[variant]} ${className}`.trim()}
          style={style}
        />
      ))}
    </span>
  );
}
