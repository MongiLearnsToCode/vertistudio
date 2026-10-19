import type { ReactNode } from 'react';

export interface Demo {
  name: string;
  description: string;
  render: () => ReactNode;
  code: string;
}

export interface DemoSection {
  title: string;
  demos: Demo[];
}
