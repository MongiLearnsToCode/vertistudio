import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { Icon } from '@renderer/components/Icon';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon = Inbox,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center text-center px-6 py-10 ${className}`.trim()}
    >
      <div className="text-text-dim mb-3">
        <Icon icon={icon} size={32} strokeWidth={1.25} />
      </div>
      <h3 className="text-[13px] font-medium text-text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-[11px] text-text-muted max-w-[320px]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
