import { useState } from 'react';
import {
  Button,
  IconButton,
  TextInput,
  SearchInput,
  Switch,
  Checkbox,
  Select,
  HStack,
} from '@shared/components';
import { Icon } from '@renderer/components/Icon';
import { Settings } from 'lucide-react';
import type { DemoSection } from './types';

function SwitchDemo() {
  const [checked, setChecked] = useState(false);
  return <Switch checked={checked} onCheckedChange={setChecked} aria-label="demo" />;
}

function CheckboxDemo() {
  const [checked, setChecked] = useState(false);
  return (
    <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} aria-label="demo" />
  );
}

function SelectDemo() {
  const [value, setValue] = useState('en');
  return (
    <Select
      value={value}
      onValueChange={setValue}
      options={[
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Español' },
      ]}
    />
  );
}

function SearchDemo() {
  const [q, setQ] = useState('');
  return <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />;
}

export const inputsSection: DemoSection = {
  title: 'Inputs',
  demos: [
    {
      name: 'Button',
      description: 'Primary action button. Variants: primary, secondary.',
      render: () => (
        <HStack gap="sm">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </HStack>
      ),
      code: `<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="primary" disabled>Disabled</Button>`,
    },
    {
      name: 'IconButton',
      description: 'Icon-only button. Pass an icon node and a label for the title attr.',
      render: () => <IconButton icon={<Icon icon={Settings} />} label="Settings" />,
      code: `<IconButton icon={<Icon icon={Settings} />} label="Settings" />`,
    },
    {
      name: 'TextInput',
      description: 'Single-line text input.',
      render: () => <TextInput placeholder="Type here…" size="md" />,
      code: `<TextInput placeholder="Type here…" size="md" />`,
    },
    {
      name: 'SearchInput',
      description: 'TextInput with a search icon at the left.',
      render: () => <SearchDemo />,
      code: `<SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />`,
    },
    {
      name: 'Switch',
      description: 'On/off toggle (Radix Switch).',
      render: () => <SwitchDemo />,
      code: `<Switch checked={value} onCheckedChange={setValue} aria-label="..." />`,
    },
    {
      name: 'Checkbox',
      description: 'Tri-state checkbox (Radix Checkbox).',
      render: () => <CheckboxDemo />,
      code: `<Checkbox checked={value} onCheckedChange={(v) => setValue(v === true)} aria-label="..." />`,
    },
    {
      name: 'Select',
      description: 'Dropdown select (Radix Select).',
      render: () => <SelectDemo />,
      code: `<Select
  value={value}
  onValueChange={setValue}
  options={[{ value: 'en', label: 'English' }, { value: 'es', label: 'Español' }]}
/>`,
    },
  ],
};
