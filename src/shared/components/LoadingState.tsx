import { Loader2 } from 'lucide-react';
import { Icon } from '@renderer/components/Icon';

export type LoadingSize = 'sm' | 'md' | 'lg';

interface LoadingStateProps {
  label?: string;
  size?: LoadingSize;
  className?: string;
}

const ICON_SIZE: Record<LoadingSize, number> = {
  sm: 16,
  md: 24,
  lg: 36,
};

const LABEL_SIZE: Record<LoadingSize, string> = {
  sm: 'text-[11px]',
  md: 'text-[12px]',
  lg: 'text-[13px]',
};

export function LoadingState({
  label = 'Loading…',
  size = 'md',
  className = '',
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-2 text-text-muted px-6 py-8 ${className}`.trim()}
    >
      <Icon icon={Loader2} size={ICON_SIZE[size]} className="animate-spin" />
      {label && <span className={`${LABEL_SIZE[size]} text-text-muted`}>{label}</span>}
    </div>
  );
}
