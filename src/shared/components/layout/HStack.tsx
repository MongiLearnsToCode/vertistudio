import { Stack, type StackProps } from './Stack';

export type HStackProps = Omit<StackProps, 'direction'>;

export function HStack(props: HStackProps) {
  return <Stack {...props} direction="row" />;
}
