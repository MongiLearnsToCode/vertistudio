import { describe, expect, it, vi } from 'vitest';
import { prepareForUpdate, registerUpdatePreparation } from '../update-preparation';
describe('Saving before installing updates', () => {
  it('waits for every registered project save', async () => {
    let finish!: () => void;
    const save = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const off = registerUpdatePreparation(save);
    let ready = false;
    const preparing = prepareForUpdate().then(() => {
      ready = true;
    });
    expect(save).toHaveBeenCalledOnce();
    expect(ready).toBe(false);
    finish();
    await preparing;
    expect(ready).toBe(true);
    off();
  });
  it('rejects installation when saving fails or a project is busy', async () => {
    const off = registerUpdatePreparation(async () => {
      throw new Error('Project save failed');
    });
    await expect(prepareForUpdate()).rejects.toThrow('Project save failed');
    off();
    await expect(prepareForUpdate()).resolves.toBeUndefined();
  });
});
