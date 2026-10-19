import { useState } from 'react';
import { Modal, Tooltip, Tabs, Button, HStack } from '@shared/components';
import type { DemoSection } from './types';

function ModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Open modal
      </Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Demo modal">
        <p className="text-[12px] text-text-secondary mb-4">
          A focus-trapped centered dialog. Press Escape to close.
        </p>
        <HStack justify="end" gap="sm">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => setOpen(false)}>
            Confirm
          </Button>
        </HStack>
      </Modal>
    </>
  );
}

function TooltipDemo() {
  return (
    <Tooltip content="I appear after a brief hover or on focus.">
      <Button variant="secondary">Hover me</Button>
    </Tooltip>
  );
}

function TabsDemo() {
  return (
    <Tabs
      defaultValue="one"
      items={[
        {
          value: 'one',
          label: 'One',
          content: <p className="text-[12px] text-text-secondary p-2">First tab body.</p>,
        },
        {
          value: 'two',
          label: 'Two',
          content: <p className="text-[12px] text-text-secondary p-2">Second tab body.</p>,
        },
      ]}
    />
  );
}

export const overlaysSection: DemoSection = {
  title: 'Overlays & navigation',
  demos: [
    {
      name: 'Modal',
      description: 'Centered focus-trapped dialog (Radix Dialog).',
      render: () => <ModalDemo />,
      code: `<Modal isOpen={open} onClose={...} title="Title">
  <p>Body</p>
</Modal>`,
    },
    {
      name: 'Tooltip',
      description: 'Hover/focus tooltip (Radix Tooltip). Auto-dismisses on Escape.',
      render: () => <TooltipDemo />,
      code: `<Tooltip content="Help text">
  <Button>Hover me</Button>
</Tooltip>`,
    },
    {
      name: 'Tabs',
      description: 'Top-level tab navigation (Radix Tabs).',
      render: () => <TabsDemo />,
      code: `<Tabs defaultValue="one" items={[
  { value: 'one', label: 'One', content: <p>First</p> },
  { value: 'two', label: 'Two', content: <p>Second</p> },
]} />`,
    },
  ],
};
