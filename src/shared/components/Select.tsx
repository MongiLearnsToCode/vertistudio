import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { Icon } from '@renderer/components/Icon';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function Select({
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = 'Select…',
  disabled,
  className = '',
  ...rest
}: SelectProps) {
  return (
    <SelectPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        aria-label={rest['aria-label']}
        className={`inline-flex items-center justify-between gap-2 px-2 h-[26px] rounded-[6px] bg-app-base text-[11px] text-text-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none data-[state=open]:border-accent ${className}`.trim()}
        style={{ border: '0.5px solid var(--color-border-input)' }}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <Icon icon={ChevronDown} size={12} className="text-text-muted" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-popover bg-app-surface rounded-md shadow-lg min-w-[var(--radix-select-trigger-width)]"
          style={{ border: '0.5px solid var(--color-border)' }}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="relative flex items-center gap-2 pl-6 pr-2 py-1 text-[11px] text-text-secondary rounded data-[highlighted]:bg-app-hover data-[highlighted]:text-text-primary data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed focus:outline-none cursor-pointer"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-1.5 text-accent-light">
                  <Icon icon={Check} size={10} />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
