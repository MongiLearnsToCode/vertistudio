import { inputsSection } from './inputs';
import { layoutSection } from './layout';
import { overlaysSection } from './overlays';
import { feedbackSection } from './feedback';
import { motionSection } from './motion';
import { advancedSection } from './advanced';
import type { DemoSection } from './types';

export type { Demo, DemoSection } from './types';

export const sections: DemoSection[] = [
  inputsSection,
  layoutSection,
  overlaysSection,
  feedbackSection,
  motionSection,
  advancedSection,
];
