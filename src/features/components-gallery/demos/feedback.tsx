import {
  EmptyState,
  LoadingState,
  Skeleton,
  ProgressBar,
  Badge,
  HStack,
  VStack,
  Button,
} from '@shared/components';
import { useToast } from '@renderer/contexts/ToastContext';
import { useConfirm } from '@renderer/contexts/DialogContext';
import { Inbox } from 'lucide-react';
import type { DemoSection } from './types';

function ToastDemo() {
  const { showToast } = useToast();
  return (
    <HStack gap="sm">
      <Button variant="primary" onClick={() => showToast('Saved successfully', 'success')}>
        Success toast
      </Button>
      <Button variant="secondary" onClick={() => showToast('Network unreachable', 'error')}>
        Error toast
      </Button>
    </HStack>
  );
}

function ConfirmDemo() {
  const confirm = useConfirm();
  const { showToast } = useToast();
  return (
    <Button
      variant="secondary"
      onClick={async () => {
        const ok = await confirm({
          title: 'Delete this item?',
          message: 'This cannot be undone.',
          confirmLabel: 'Delete',
          intent: 'danger',
        });
        showToast(ok ? 'Confirmed' : 'Canceled', 'info');
      }}
    >
      Open confirm
    </Button>
  );
}

export const feedbackSection: DemoSection = {
  title: 'Status & feedback',
  demos: [
    {
      name: 'Toast',
      description: 'Transient notification via useToast() from ToastContext.',
      render: () => <ToastDemo />,
      code: `const { showToast } = useToast();
showToast('Saved successfully', 'success');`,
    },
    {
      name: 'ConfirmDialog',
      description: 'Promise-based confirm via useConfirm() from DialogContext.',
      render: () => <ConfirmDemo />,
      code: `const confirm = useConfirm();
const ok = await confirm({
  title: 'Delete this item?',
  message: 'This cannot be undone.',
  confirmLabel: 'Delete',
  intent: 'danger',
});`,
    },
    {
      name: 'EmptyState',
      description: '"No items yet" with icon, title, optional description and action.',
      render: () => (
        <EmptyState
          icon={Inbox}
          title="Nothing here yet"
          description="Once you create one, it'll show up in this list."
        />
      ),
      code: `<EmptyState
  icon={Inbox}
  title="Nothing here yet"
  description="Once you create one, it'll show up here."
/>`,
    },
    {
      name: 'LoadingState',
      description: 'Centered spinner with optional label.',
      render: () => <LoadingState label="Loading…" size="md" />,
      code: `<LoadingState label="Loading…" size="md" />`,
    },
    {
      name: 'Skeleton',
      description: 'Pulse-loading placeholder for content shape.',
      render: () => (
        <VStack gap="xs">
          <Skeleton variant="text" />
          <Skeleton variant="text" />
          <Skeleton variant="box" />
        </VStack>
      ),
      code: `<Skeleton variant="text" />
<Skeleton variant="box" />`,
    },
    {
      name: 'ProgressBar',
      description: 'Linear progress indicator. Color via prop.',
      render: () => (
        <VStack gap="xs">
          <ProgressBar value={30} color="purple" />
          <ProgressBar value={60} color="green" />
          <ProgressBar value={90} color="amber" />
        </VStack>
      ),
      code: `<ProgressBar value={60} color="green" />`,
    },
    {
      name: 'Badge',
      description: 'Status pill. Variants: free, pro.',
      render: () => (
        <HStack gap="sm">
          <Badge variant="free">Free</Badge>
          <Badge variant="pro">Pro</Badge>
        </HStack>
      ),
      code: `<Badge variant="pro">Pro</Badge>`,
    },
  ],
};
