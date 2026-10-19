import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  className?: string;
}

export function Tabs({ items, defaultValue, value, onValueChange, className = '' }: TabsProps) {
  return (
    <TabsPrimitive.Root
      defaultValue={defaultValue ?? items[0]?.value}
      value={value}
      onValueChange={onValueChange}
      className={className}
    >
      <TabsPrimitive.List
        className="flex gap-1"
        style={{ borderBottom: '0.5px solid var(--color-border)' }}
      >
        {items.map((item) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            className="px-3 py-2 text-[11px] text-text-muted hover:text-text-secondary data-[state=active]:text-accent-light data-[state=active]:border-b-2 data-[state=active]:border-accent -mb-px focus:outline-none cursor-pointer transition-colors duration-fast"
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content
          key={item.value}
          value={item.value}
          className="pt-3 focus:outline-none"
        >
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
