import * as SwitchPrimitive from '@radix-ui/react-switch';

interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function Switch({ className = '', ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={`w-9 h-5 rounded-full bg-app-hover data-[state=checked]:bg-accent transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`.trim()}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block w-4 h-4 rounded-full bg-white translate-x-0.5 data-[state=checked]:translate-x-[18px] transition-transform duration-fast shadow-sm" />
    </SwitchPrimitive.Root>
  );
}
