import { describe, expect, it, vi } from 'vitest';
import { ProjectSaveQueue, projectFingerprint, type ProjectDraft } from '../project-save-queue';
import type { ProjectSaveRequest, ProjectSummary } from '@shared/ipc/types';

const id = 'd264b118-e699-436b-8bdc-fb52a08770f9';
const draft: ProjectDraft = {
  name: 'Interview',
  cuts: [{ videoId: '9c28301c-283e-4d12-82c7-7e126734ae15', trim: { start: 1, end: 4 } }],
  options: { preset: 'quality', fit: 'auto', encoder: 'libx264', keepFps: true },
};
const summary = (request: ProjectSaveRequest): ProjectSummary => ({
  id,
  name: request.name,
  updatedAt: new Date().toISOString(),
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe('Serialized project autosave', () => {
  it('creates no projects until footage is imported and skips unchanged snapshots', async () => {
    const persist = vi.fn(async (request: ProjectSaveRequest) => summary(request));
    const queue = new ProjectSaveQueue(persist);
    queue.update({ ...draft, cuts: [] });
    await queue.flush();
    expect(persist).not.toHaveBeenCalled();
    queue.update(draft);
    await queue.flush();
    await queue.flush();
    expect(persist).toHaveBeenCalledTimes(1);
    expect(queue.dirty).toBe(false);
  });
  it('serializes overlapping saves and keeps edits made during the initial source copy', async () => {
    const first = deferred<ProjectSummary>();
    const persist = vi
      .fn(async (request: ProjectSaveRequest) => summary(request))
      .mockImplementationOnce(() => first.promise);
    const queue = new ProjectSaveQueue(persist);
    queue.update(draft);
    const saving = queue.flush();
    const edited = { ...draft, cuts: [{ ...draft.cuts[0]!, trim: { start: 2, end: 7 } }] };
    queue.update(edited);
    const again = queue.flush();
    expect(persist).toHaveBeenCalledTimes(1);
    expect(queue.dirty).toBe(true);
    first.resolve(summary(draft));
    await Promise.all([saving, again]);
    expect(persist).toHaveBeenCalledTimes(2);
    expect(persist.mock.calls[1]?.[0]).toMatchObject({ id, cuts: edited.cuts });
    expect(queue.saved).toBe(projectFingerprint(edited));
  });
  it('restores the original snapshot if edits are reverted during an in-flight save', async () => {
    const pending = deferred<ProjectSummary>();
    const persist = vi
      .fn(async (request: ProjectSaveRequest) => summary(request))
      .mockImplementationOnce(() => pending.promise);
    const queue = new ProjectSaveQueue(persist);
    queue.restore(id, draft);
    queue.update({ ...draft, name: 'Changed' });
    const saving = queue.flush();
    queue.update(draft);
    expect(queue.dirty).toBe(true);
    const closing = queue.flush();
    pending.resolve({ ...summary(draft), name: 'Changed' });
    await Promise.all([saving, closing]);
    expect(persist.mock.calls.at(-1)?.[0].name).toBe('Interview');
    expect(queue.dirty).toBe(false);
  });
  it('keeps unsaved edits and the assigned ID after failure, so retry creates no duplicate', async () => {
    const persist = vi.fn(async (request: ProjectSaveRequest) => summary(request));
    const queue = new ProjectSaveQueue(persist);
    queue.update(draft);
    await queue.flush();
    queue.update({ ...draft, name: 'Renamed' });
    persist.mockRejectedValueOnce(new Error('Disk full'));
    await expect(queue.flush()).rejects.toThrow('Disk full');
    expect(queue.id).toBe(id);
    expect(queue.dirty).toBe(true);
    await queue.flush();
    expect(persist.mock.calls.at(-1)?.[0]).toMatchObject({ id, name: 'Renamed' });
    expect(queue.dirty).toBe(false);
  });
  it('persists removing the last cut from an existing project', async () => {
    const persist = vi.fn(async (request: ProjectSaveRequest) => summary(request));
    const queue = new ProjectSaveQueue(persist);
    queue.restore(id, draft);
    queue.update({ ...draft, cuts: [] });
    await queue.flush();
    expect(persist).toHaveBeenCalledWith(expect.objectContaining({ id, cuts: [] }));
  });
});
