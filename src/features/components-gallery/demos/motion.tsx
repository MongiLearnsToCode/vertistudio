import { useState } from 'react';
import { FadeIn, SlideIn, ScaleIn, Button, HStack, VStack } from '@shared/components';
import type { DemoSection } from './types';

function ReplayWrapper({ render }: { render: (key: number) => React.ReactNode }) {
  const [key, setKey] = useState(0);
  return (
    <VStack gap="sm">
      <div className="p-3 bg-app-surface rounded border border-border min-h-[60px] flex items-center justify-center">
        {render(key)}
      </div>
      <HStack gap="sm">
        <Button variant="secondary" onClick={() => setKey((k) => k + 1)}>
          Replay
        </Button>
      </HStack>
    </VStack>
  );
}

export const motionSection: DemoSection = {
  title: 'Motion',
  demos: [
    {
      name: 'FadeIn',
      description:
        'Opacity 0 → 1 on mount. Honors prefers-reduced-motion globally (animation duration becomes ~0ms).',
      render: () => (
        <ReplayWrapper
          render={(k) => (
            <FadeIn key={k} duration="normal">
              <span className="text-[12px] text-text-secondary">Faded in.</span>
            </FadeIn>
          )}
        />
      ),
      code: `<FadeIn duration="normal">{children}</FadeIn>`,
    },
    {
      name: 'SlideIn',
      description: 'Slide-in from up/down/left/right with a brief opacity fade.',
      render: () => (
        <ReplayWrapper
          render={(k) => (
            <HStack gap="sm">
              <SlideIn key={`up-${k}`} direction="up">
                <span className="text-[12px] text-text-secondary">↑ up</span>
              </SlideIn>
              <SlideIn key={`right-${k}`} direction="right">
                <span className="text-[12px] text-text-secondary">→ right</span>
              </SlideIn>
            </HStack>
          )}
        />
      ),
      code: `<SlideIn direction="up">{children}</SlideIn>
<SlideIn direction="right" duration="fast">{children}</SlideIn>`,
    },
    {
      name: 'ScaleIn',
      description: 'Scale 0.96 → 1 on mount. Use for popovers, cards, callouts.',
      render: () => (
        <ReplayWrapper
          render={(k) => (
            <ScaleIn key={k}>
              <div className="p-3 bg-app-base rounded border border-border text-[12px] text-text-secondary">
                Scaled in.
              </div>
            </ScaleIn>
          )}
        />
      ),
      code: `<ScaleIn>{children}</ScaleIn>`,
    },
  ],
};
