// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@renderer/contexts/ToastContext';
import { useProjects } from '../hooks/useProjects';
import type { QueueItem } from '../types';
import type { ProjectSaveRequest, ProjectSummary } from '@shared/ipc/types';
import type { VideoResult } from '@shared/video/types';

const id = 'd264b118-e699-436b-8bdc-fb52a08770f9';
const item: QueueItem = {
  id: '9c28301c-283e-4d12-82c7-7e126734ae15',
  trim: { start: 1, end: 4 },
  status: 'queued',
  percent: 0,
  video: {
    id: '9c28301c-283e-4d12-82c7-7e126734ae15',
    name: 'Interview.mp4',
    path: '/Interview.mp4',
    duration: 20,
    width: 1920,
    height: 1080,
    fps: 30,
    size: 100,
    hasAudio: true,
    videoCodec: 'h264',
    bitDepth: '8',
    previewUrl: '',
  },
};
const options: ProjectSaveRequest['options'] = {
  preset: 'quality',
  fit: 'crop',
  encoder: 'libx264',
  keepFps: true,
  both: true,
};
const saved = (name = 'Interview'): VideoResult<ProjectSummary> => ({
  success: true,
  value: { id, name, updatedAt: new Date().toISOString() },
});
const report = vi.fn();
const updateItems = vi.fn();
let operationLock: { current: boolean };
function useTestProjects(items: QueueItem[]) {
  return useProjects({
    items,
    options,
    busy: false,
    operationLock,
    report,
    updateItems,
    applyOptions: async () => {},
    setSelectedId: vi.fn(),
    resetOutput: vi.fn(),
  });
}
beforeEach(() => {
  vi.useFakeTimers();
  report.mockClear();
  updateItems.mockClear();
  operationLock = { current: false };
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      platform: 'linux',
      logSend: vi.fn(async () => {}),
      projectList: vi.fn(async () => ({ success: true, value: [] })),
      projectSave: vi.fn(async (request: ProjectSaveRequest) => saved(request.name)),
      windowClose: vi.fn(async () => {}),
    },
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Automatic project saving', () => {
  it('automatically names and saves imported footage, coalescing rapid cut edits', async () => {
    const { result, rerender } = renderHook(({ items }) => useTestProjects(items), {
      initialProps: { items: [] as QueueItem[] },
      wrapper: ToastProvider,
    });
    await act(async () => {});
    rerender({ items: [item] });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(window.api.projectSave).not.toHaveBeenCalled();
    rerender({ items: [{ ...item, trim: { start: 2, end: 8 } }] });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(window.api.projectSave).toHaveBeenCalledTimes(1);
    expect(window.api.projectSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Interview',
        cuts: [{ videoId: item.video.id, trim: { start: 2, end: 8 } }],
        options,
      }),
    );
    expect(result.current.id).toBe(id);
    expect(result.current.dirty).toBe(false);
    expect(result.current.working).toBe(false);
    act(() => result.current.setName('My interview'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(window.api.projectSave).toHaveBeenLastCalledWith(
      expect.objectContaining({ id, name: 'My interview' }),
    );
  });
  it('shows save failures, preserves edits, and lets retry save successfully', async () => {
    vi.mocked(window.api.projectSave).mockResolvedValueOnce({ success: false, error: 'Disk full' });
    const { result } = renderHook(() => useTestProjects([item]), { wrapper: ToastProvider });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });
    expect(result.current.saveError).toBe('Disk full');
    expect(result.current.dirty).toBe(true);
    expect(report).toHaveBeenCalledTimes(1);
    await act(async () => {
      await result.current.save();
    });
    expect(result.current.saveError).toBe('');
    expect(result.current.dirty).toBe(false);
  });
  it('waits for saving before closing the window', async () => {
    let finish!: (result: VideoResult<ProjectSummary>) => void;
    vi.mocked(window.api.projectSave).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { result } = renderHook(() => useTestProjects([item]), { wrapper: ToastProvider });
    await act(async () => {});
    const event = new Event('beforeunload', { cancelable: true });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(window.api.windowClose).not.toHaveBeenCalled();
    expect(result.current.working).toBe(false);
    expect(operationLock.current).toBe(false);
    await act(async () => {
      finish(saved());
    });
    expect(window.api.windowClose).toHaveBeenCalledTimes(1);
    expect(result.current.dirty).toBe(false);
  });
  it('keeps the window and project open if saving on close fails', async () => {
    vi.mocked(window.api.projectSave).mockResolvedValueOnce({ success: false, error: 'Disk full' });
    const { result } = renderHook(() => useTestProjects([item]), { wrapper: ToastProvider });
    await act(async () => {});
    await act(async () => {
      window.dispatchEvent(new Event('beforeunload', { cancelable: true }));
    });
    expect(window.api.windowClose).not.toHaveBeenCalled();
    expect(result.current.saveError).toBe('Disk full');
    expect(result.current.dirty).toBe(true);
  });
  it('saves pending changes before starting another project', async () => {
    const { result } = renderHook(() => useTestProjects([item]), { wrapper: ToastProvider });
    await act(async () => {});
    await act(async () => {
      await result.current.switchProject();
    });
    expect(window.api.projectSave).toHaveBeenCalledTimes(1);
    expect(updateItems).toHaveBeenCalled();
    expect(result.current.id).toBeUndefined();
    expect(result.current.name).toBe('Untitled project');
  });
});
