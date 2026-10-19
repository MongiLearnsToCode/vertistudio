import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { Icon } from '@renderer/components/Icon';

interface CheckboxProps {
  checked?: boolean | 'indeterminate';
  defaultChecked?: boolean | 'indeterminate';
  onCheckedChange?: (checked: boolean | 'indeterminate') => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  id?: string;
}

export function Checkbox({ className = '', ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      className={`flex items-center justify-center w-4 h-4 rounded bg-app-base data-[state=checked]:bg-accent data-[state=indeterminate]:bg-accent transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`.trim()}
      style={{ border: '0.5px solid var(--color-border-input)' }}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="text-white">
        {props.checked === 'indeterminate' ? (
          <Icon icon={Minus} size={12} strokeWidth={2.5} />
        ) : (
          <Icon icon={Check} size={12} strokeWidth={2.5} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
