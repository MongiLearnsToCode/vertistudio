import {
  Panel,
  Card,
  HStack,
  VStack,
  Grid,
  Divider,
  Container,
  PageHeader,
  Spacer,
} from '@shared/components';
import type { DemoSection } from './types';

export const layoutSection: DemoSection = {
  title: 'Layout',
  demos: [
    {
      name: 'Panel',
      description: 'Bordered card with optional header. Default container for settings.',
      render: () => (
        <Panel header="Panel header">
          <div className="p-3 text-[12px] text-text-secondary">Panel body content.</div>
        </Panel>
      ),
      code: `<Panel header="Panel header">
  <div className="p-3">Panel body content.</div>
</Panel>`,
    },
    {
      name: 'Card',
      description: 'Looser container — no header, ideal for non-settings groups.',
      render: () => (
        <Card>
          <div className="p-3 text-[12px] text-text-secondary">Card body.</div>
        </Card>
      ),
      code: `<Card><div className="p-3">Card body.</div></Card>`,
    },
    {
      name: 'Stack / HStack / VStack',
      description: 'Flex containers with a gap prop. The default layout primitive.',
      render: () => (
        <VStack gap="sm">
          <HStack gap="sm">
            <span className="text-[11px] text-text-secondary">Item 1</span>
            <span className="text-[11px] text-text-secondary">Item 2</span>
          </HStack>
          <Divider />
          <span className="text-[11px] text-text-muted">Below the divider</span>
        </VStack>
      ),
      code: `<VStack gap="sm">
  <HStack gap="sm">...</HStack>
  <Divider />
</VStack>`,
    },
    {
      name: 'Grid',
      description: 'CSS grid wrapper, columns via prop.',
      render: () => (
        <Grid cols={3} gap="sm">
          {['A', 'B', 'C', 'D', 'E', 'F'].map((c) => (
            <div
              key={c}
              className="p-2 text-[11px] text-text-secondary text-center bg-app-surface rounded"
            >
              {c}
            </div>
          ))}
        </Grid>
      ),
      code: `<Grid cols={3} gap="sm">{items.map((c) => <div key={c}>{c}</div>)}</Grid>`,
    },
    {
      name: 'Spacer',
      description: 'Flex 1 filler. Use sparingly — Stack with justify usually wins.',
      render: () => (
        <HStack className="w-full">
          <span className="text-[11px] text-text-secondary">Left</span>
          <Spacer />
          <span className="text-[11px] text-text-secondary">Right</span>
        </HStack>
      ),
      code: `<HStack><span>Left</span><Spacer /><span>Right</span></HStack>`,
    },
    {
      name: 'Divider',
      description: '1px border line. Honors theme tokens.',
      render: () => (
        <div className="w-full">
          <Divider />
        </div>
      ),
      code: `<Divider />`,
    },
    {
      name: 'Container',
      description: 'Max-width wrapper for screen content.',
      render: () => (
        <Container maxWidth="md" className="bg-app-surface p-2 rounded">
          <span className="text-[11px] text-text-secondary">Container maxWidth=&quot;md&quot;</span>
        </Container>
      ),
      code: `<Container maxWidth="md">…</Container>`,
    },
    {
      name: 'PageHeader',
      description: 'Title + subtitle + actions row.',
      render: () => <PageHeader title="Page title" description="Optional description line." />,
      code: `<PageHeader title="Page title" description="Optional description line." />`,
    },
  ],
};
