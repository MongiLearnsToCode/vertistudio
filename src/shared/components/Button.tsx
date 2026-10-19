import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary';
  size?: 'sm' | 'md';
  children: ReactNode;
}

export function Button({
  variant,
  size = 'sm',
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  // `inline-flex` so icon + text children flow horizontally (otherwise
  // a Lucide SVG child wraps onto its own line and the text wraps too).
  // `whitespace-nowrap` keeps multi-word labels on a single line so the
  // toolbar height isn't pushed by a wrapping "New note" → "New / note".
  const baseClasses =
    'inline-flex items-center justify-center whitespace-nowrap rounded-[6px] cursor-pointer transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeClasses = size === 'sm' ? 'px-[10px] py-[4px]' : 'px-[14px] py-[6px]';

  const variantClasses =
    variant === 'primary'
      ? 'bg-accent text-white border-none hover:opacity-90'
      : 'bg-transparent text-text-secondary hover:bg-app-hover';

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      style={{
        fontSize: 11,
        ...(variant === 'secondary' ? { border: '0.5px solid var(--color-border-hover)' } : {}),
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
