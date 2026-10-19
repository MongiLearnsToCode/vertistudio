// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DialogProvider } from '@renderer/contexts/DialogContext';
import { ToastProvider } from '@renderer/contexts/ToastContext';
import { APP_SETTINGS_DEFAULTS } from '@shared/validation/settings-schema';
import type { ProjectSaveRequest } from '@shared/ipc/types';
import type { VideoEvent, VideoInfo } from '@shared/video/types';
import { StudioScreen } from '../components/StudioScreen';
import { CutEditor } from '../components/CutEditor';
import { useStudio } from '../hooks/useStudio';

const video: VideoInfo = {
  id: '9c28301c-283e-4d12-82c7-7e126734ae15',
  path: '/footage.mp4',
  name: 'footage.mp4',
  previewUrl: 'verti-media://local/test',
  width: 1920,
  height: 1080,
  fps: 25,
  duration: 10.123456,
  size: 1000,
  videoCodec: 'h264',
  bitDepth: '8-bit',
  hasAudio: true,
};
function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DialogProvider>
      <ToastProvider>{children}</ToastProvider>
    </DialogProvider>
  );
}
let notify: (event: VideoEvent) => void;
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  const api = {
    projectList: vi.fn(async () => ({ success: true, value: [] })),
    projectSave: vi.fn(async (request: ProjectSaveRequest) => ({
      success: true,
      value: {
        id: 'd264b118-e699-436b-8bdc-fb52a08770f9',
        name: request.name,
        updatedAt: new Date().toISOString(),
      },
    })),
    platform: 'linux',
    logSend: vi.fn(async () => {}),
    settingsGet: vi.fn(async ({ key }: { key: keyof typeof APP_SETTINGS_DEFAULTS }) => ({
      value: APP_SETTINGS_DEFAULTS[key],
    })),
    settingsSet: vi.fn(async () => ({ success: true })),
    onSettingsChange: vi.fn(() => () => {}),
    videoBootstrap: vi.fn(async () => ({
      success: true,
      value: { ready: true, version: 'test', ffmpegPath: '/ffmpeg', encoders: { libx264: true } },
    })),
    onVideoEvent: vi.fn((handler: typeof notify) => {
      notify = handler;
      return () => {};
    }),
    dialogOpenFile: vi.fn(async (options: { directory?: boolean }) => ({
      canceled: false,
      filePaths: [options.directory ? '/exports' : video.path],
    })),
    videoCheckOutput: vi.fn(async ({ path }: { path: string }) => ({ success: true, value: path })),
    videoImport: vi.fn(async () => ({ success: true, value: video })),
    videoThumbnail: vi.fn(async () => ({ success: true, value: 'data:image/jpeg;base64,test' })),
    videoExport: vi.fn(async (request: { id: string }) => {
      queueMicrotask(() =>
        notify({ id: request.id, type: 'done', output: '/exports/cut.mp4', size: 12345 }),
      );
      return { success: true, value: '/exports/cut.mp4' };
    }),
    videoCancel: vi.fn(async ({ id }: { id: string }) => {
      notify({ id, type: 'canceled' });
      return { success: true, value: null };
    }),
  };
  Object.defineProperty(window, 'api', { configurable: true, value: api });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Studio workflow', () => {
  it('imports, cuts, selects a folder, and exports the range with existing options', async () => {
    const { result } = renderHook(() => useStudio(), { wrapper: Providers });
    await waitFor(() => expect(result.current.engine?.ready).toBe(true));
    await act(async () => {
      await result.current.pickFiles();
    });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.selected?.trim.end).toBe(video.duration);
    await act(async () => {
      await result.current.pickFiles();
    });
    expect(result.current.items).toHaveLength(1);
    act(() => result.current.changeTrim(video.id, { start: 0.52, end: 1.24 }));
    await act(async () => {
      await result.current.chooseOutput();
    });
    await act(async () => {
      await result.current.exportAll();
    });
    expect(window.api.videoExport).toHaveBeenCalledWith(
      expect.objectContaining({
        id: video.id,
        trim: { start: 0.52, end: 1.24 },
        preset: 'quality',
        fit: 'auto',
        encoder: 'libx264',
        outputDirectory: '/exports',
      }),
    );
    expect(result.current.items[0]?.status).toBe('done');
    expect(result.current.items[0]?.outputSize).toBe(12345);
    expect(result.current.running).toBe(false);
    act(() => result.current.changeTrim(video.id, { start: 0, end: video.duration }));
    expect(result.current.items[0]?.status).toBe('queued');
    act(() => result.current.clear());
    expect(result.current.items).toHaveLength(0);
  });
  it('creates and exports independent shorts from one import, then saves their ranges', async () => {
    const { result } = renderHook(() => useStudio(), { wrapper: Providers });
    await waitFor(() => expect(result.current.engine?.ready).toBe(true));
    await act(async () => {
      await result.current.pickFiles();
      await result.current.chooseOutput();
    });
    act(() => result.current.changeTrim(video.id, { start: 1, end: 2 }));
    act(() => result.current.newShort());
    const second = result.current.selectedId!;
    expect(second).not.toBe(video.id);
    act(() => result.current.changeTrim(second, { start: 4, end: 6 }));
    expect(window.api.videoImport).toHaveBeenCalledTimes(1);
    expect(result.current.items.map((item) => item.trim)).toEqual([
      { start: 1, end: 2 },
      { start: 4, end: 6 },
    ]);
    await act(async () => {
      await result.current.projects.save();
    });
    expect(window.api.projectSave).toHaveBeenCalledWith(
      expect.objectContaining({
        cuts: [
          { videoId: video.id, trim: { start: 1, end: 2 } },
          { videoId: video.id, trim: { start: 4, end: 6 } },
        ],
      }),
    );
    expect(result.current.projects.dirty).toBe(false);
    await act(async () => {
      await result.current.exportAll();
    });
    expect(window.api.videoExport).toHaveBeenCalledTimes(2);
    expect(result.current.items.every((item) => item.status === 'done')).toBe(true);
    expect(result.current.items.map((item) => item.trim)).toEqual([
      { start: 1, end: 2 },
      { start: 4, end: 6 },
    ]);
    act(() => result.current.newShort());
    expect(result.current.projects.dirty).toBe(true);
    expect(result.current.items).toHaveLength(3);
  });
  it('reopens saved cuts with fresh queue IDs without using the file picker', async () => {
    Object.assign(window.api, {
      projectOpen: vi.fn(async () => ({
        success: true,
        value: {
          id: 'd264b118-e699-436b-8bdc-fb52a08770f9',
          name: 'Interview',
          updatedAt: new Date().toISOString(),
          options: { preset: 'quality', fit: 'auto', encoder: 'libx264', keepFps: true },
          cuts: [
            { video, trim: { start: 1, end: 3 } },
            { video, trim: { start: 6, end: 9 } },
          ],
        },
      })),
      settingsSet: vi.fn(async () => ({ success: true })),
    });
    const { result } = renderHook(() => useStudio(), { wrapper: Providers });
    await waitFor(() => expect(result.current.engine?.ready).toBe(true));
    await act(async () => {
      await result.current.projects.switchProject('d264b118-e699-436b-8bdc-fb52a08770f9');
    });
    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0]?.id).not.toBe(result.current.items[1]?.id);
    expect(result.current.projects.name).toBe('Interview');
    expect(result.current.projects.dirty).toBe(false);
    expect(window.api.videoImport).not.toHaveBeenCalled();
    expect(window.api.dialogOpenFile).not.toHaveBeenCalled();
  });
  it('lets users select original aspect ratio, export with it, and save that choice', async () => {
    vi.mocked(window.api.settingsSet).mockImplementation(async (request) => {
      for (const [handler] of vi.mocked(window.api.onSettingsChange).mock.calls) {
        handler({ key: request.key, value: request.value });
      }
      return { success: true };
    });
    const view = render(<StudioScreen />, { wrapper: Providers });
    await waitFor(() =>
      expect(view.getByText('FFmpeg ready · Files stay on this computer')).toBeTruthy(),
    );
    fireEvent.click(view.getByRole('button', { name: 'Import video' }));
    await waitFor(() =>
      expect(view.getByRole('button', { name: 'New short' }).hasAttribute('disabled')).toBe(false),
    );
    fireEvent.click(view.getByRole('radio', { name: /^Original aspect ratio/ }));
    await waitFor(() =>
      expect(view.queryByRole('combobox', { name: 'Export framing' })).toBeNull(),
    );
    expect(view.getByText('1920 × 1080 · Original aspect ratio · H.264 MP4')).toBeTruthy();
    fireEvent.click(view.getByRole('button', { name: 'Choose export folder…' }));
    await waitFor(() =>
      expect(view.getByRole('button', { name: 'Export clip' }).hasAttribute('disabled')).toBe(
        false,
      ),
    );
    fireEvent.click(view.getByRole('button', { name: 'Export clip' }));
    await waitFor(() =>
      expect(window.api.videoExport).toHaveBeenCalledWith(expect.objectContaining({ fit: 'keep' })),
    );
    await waitFor(() =>
      expect(view.getByRole('button', { name: 'Save project' }).hasAttribute('disabled')).toBe(
        false,
      ),
    );
    fireEvent.click(view.getByRole('button', { name: 'Save project' }));
    await waitFor(() =>
      expect(window.api.projectSave).toHaveBeenCalledWith(
        expect.objectContaining({ options: expect.objectContaining({ fit: 'keep' }) }),
      ),
    );
    await waitFor(() =>
      expect(view.getByRole('button', { name: 'Save project' }).hasAttribute('disabled')).toBe(
        false,
      ),
    );
    fireEvent.click(view.getByRole('radio', { name: 'Vertical (9:16)' }));
    await waitFor(() =>
      expect(view.getByRole('combobox', { name: 'Export framing' })).toBeTruthy(),
    );
    expect(window.api.settingsSet).toHaveBeenLastCalledWith({ key: 'videoFit', value: 'auto' });
  });
  it('exports both formats from one action and saves that option', async () => {
    vi.mocked(window.api.settingsSet).mockImplementation(async (request) => {
      for (const [handler] of vi.mocked(window.api.onSettingsChange).mock.calls)
        handler({ key: request.key, value: request.value });
      return { success: true };
    });
    vi.mocked(window.api.videoExport).mockImplementation(async (request) => {
      queueMicrotask(() =>
        notify({
          id: request.id,
          type: 'done',
          size: 300,
          output: '/exports/Vertical.mp4',
          outputs: [
            { format: 'original', path: '/exports/Original.mp4', size: 100 },
            { format: 'vertical', path: '/exports/Vertical.mp4', size: 200 },
          ],
        }),
      );
      return { success: true, value: '/exports/Vertical.mp4' };
    });
    const view = render(<StudioScreen />, { wrapper: Providers });
    await waitFor(() =>
      expect(view.getByText('FFmpeg ready · Files stay on this computer')).toBeTruthy(),
    );
    fireEvent.click(view.getByRole('button', { name: 'Import video' }));
    await waitFor(() =>
      expect(view.getByRole('button', { name: 'New short' }).hasAttribute('disabled')).toBe(false),
    );
    fireEvent.click(view.getByRole('radio', { name: /^Both \(original/ }));
    await waitFor(() => expect(view.getByRole('button', { name: 'Export 2 files' })).toBeTruthy());
    fireEvent.click(view.getByRole('button', { name: 'Choose export folder…' }));
    await waitFor(() =>
      expect(view.getByRole('button', { name: 'Export 2 files' }).hasAttribute('disabled')).toBe(
        false,
      ),
    );
    fireEvent.click(view.getByRole('button', { name: 'Export 2 files' }));
    await waitFor(() =>
      expect(window.api.videoExport).toHaveBeenCalledWith(
        expect.objectContaining({
          both: true,
          fit: 'auto',
          trim: { start: 0, end: video.duration },
        }),
      ),
    );
    await waitFor(() => expect(view.getByRole('button', { name: 'Open original' })).toBeTruthy());
    expect(view.getByRole('button', { name: 'Open vertical' })).toBeTruthy();
    fireEvent.click(view.getByRole('button', { name: 'Save project' }));
    await waitFor(() =>
      expect(window.api.projectSave).toHaveBeenCalledWith(
        expect.objectContaining({ options: expect.objectContaining({ both: true }) }),
      ),
    );
  });
  it('rejects reversed cuts and handles cancellation as a terminal event', async () => {
    const { result } = renderHook(() => useStudio(), { wrapper: Providers });
    await waitFor(() => expect(result.current.engine?.ready).toBe(true));
    await act(async () => {
      await result.current.pickFiles();
      await result.current.chooseOutput();
    });
    act(() => result.current.changeTrim(video.id, { start: 3, end: 2 }));
    expect(result.current.items[0]?.trim.start).toBe(0);
    vi.mocked(window.api.videoExport).mockResolvedValue({
      success: true,
      value: '/exports/cut.mp4',
    });
    let batch: Promise<void> | undefined;
    act(() => {
      batch = result.current.exportAll();
    });
    await waitFor(() => expect(result.current.items[0]?.status).toBe('encoding'));
    await act(async () => {
      result.current.cancelAll();
      await batch;
    });
    expect(window.api.videoCancel).toHaveBeenCalledWith({ id: video.id });
    expect(result.current.items[0]?.status).toBe('canceled');
    expect(result.current.running).toBe(false);
  });
  it('connects preview scrubbing, frame steps and typed boundaries to the cut', async () => {
    const onTrim = vi.fn();
    const onValidity = vi.fn();
    const { container, getByLabelText, getByRole } = render(
      <CutEditor
        item={{
          id: video.id,
          video,
          trim: { start: 0, end: video.duration },
          status: 'queued',
          percent: 0,
        }}
        locked={false}
        onTrim={onTrim}
        onValidity={onValidity}
      />,
    );
    const player = container.querySelector('video')!;
    fireEvent.loadedMetadata(player);
    const playhead = getByLabelText('Playhead');
    fireEvent.change(playhead, { target: { value: '1.52' } });
    expect(player.currentTime).toBe(1.52);
    fireEvent.click(getByRole('button', { name: 'Next frame' }));
    expect(player.currentTime).toBeCloseTo(1.56);
    fireEvent.click(getByRole('button', { name: 'Set in at playhead' }));
    expect(onTrim).toHaveBeenLastCalledWith(video.id, { start: 1.56, end: video.duration });
    const out = container.querySelector<HTMLInputElement>('#cut-end')!;
    fireEvent.change(out, { target: { value: '00:00:05.000' } });
    expect(onTrim).toHaveBeenLastCalledWith(video.id, { start: 1.56, end: 5 });
    fireEvent.change(out, { target: { value: 'bad' } });
    expect(getByRole('alert').textContent).toContain('valid times');
    expect(onValidity).toHaveBeenLastCalledWith(false);
  });
});
