const preparations = new Set<() => Promise<void>>();
export function registerUpdatePreparation(prepare: () => Promise<void>) {
  preparations.add(prepare);
  return () => {
    preparations.delete(prepare);
  };
}
export async function prepareForUpdate() {
  for (const prepare of preparations) await prepare();
}
