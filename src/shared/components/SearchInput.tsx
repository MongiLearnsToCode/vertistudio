import { forwardRef, type InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { Icon } from '@renderer/components/Icon';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  size?: 'sm' | 'md';
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput({ size = 'sm', className = '', ...props }, ref) {
    const heightCls = size === 'sm' ? 'h-[26px]' : 'h-[32px]';
    return (
      <div className={`relative ${className}`.trim()}>
        <Icon
          icon={Search}
          size={12}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        />
        <input
          ref={ref}
          type="search"
          className={`bg-app-base text-text-primary rounded-[6px] pl-7 pr-2 focus:outline-none w-full ${heightCls}`}
          style={{ fontSize: 11, border: '0.5px solid var(--color-border-input)' }}
          {...props}
        />
      </div>
    );
  },
);
