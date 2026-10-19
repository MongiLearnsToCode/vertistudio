import { Stack, type StackProps } from './Stack';

export type VStackProps = Omit<StackProps, 'direction'>;

export function VStack(props: VStackProps) {
  return <Stack {...props} direction="col" />;
}
