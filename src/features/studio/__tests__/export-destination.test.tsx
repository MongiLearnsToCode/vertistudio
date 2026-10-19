// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@renderer/contexts/ToastContext';
import { useDefaultExportDirectory } from '@renderer/hooks/useDefaultExportDirectory';
import { APP_SETTINGS_DEFAULTS, type AppSettings } from '@shared/validation/settings-schema';
import type {
  SettingsChangeEvent,
  SettingsGetRequest,
  SettingsSetRequest,
} from '@shared/ipc/types';
import type { VideoResult } from '@shared/video/types';
import { StudioScreen } from '../components/StudioScreen';
import { useOutputDirectory } from '../hooks/useOutputDirectory';

let values: AppSettings;
const report = vi.fn();
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  values = { ...APP_SETTINGS_DEFAULTS };
  report.mockClear();
  const listeners = new Set<(event: SettingsChangeEvent) => void>();
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      platform: 'linux',
      logSend: vi.fn(async () => {}),
      settingsGet: vi.fn(async ({ key }: SettingsGetRequest) => ({ value: values[key] })),
      settingsSet: vi.fn(async ({ key, value }: SettingsSetRequest) => {
        values = { ...values, [key]: value };
        for (const listener of listeners) listener({ key, value });
        return { success: true };
      }),
      onSettingsChange: vi.fn((listener: (event: SettingsChangeEvent) => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }),
      dialogOpenFile: vi.fn(async () => ({ canceled: false, filePaths: ['/chosen'] })),
      videoCheckOutput: vi.fn(async ({ path }: { path: string }) => ({
        success: true,
        value: path,
      })),
      videoBootstrap: vi.fn(async () => ({
        success: true,
        value: {
          ready: true,
          version: 'test',
          ffmpegPath: '/ffmpeg',
          encoders: { libx264: true, h264_nvenc: false, h264_qsv: false, h264_vaapi: false },
        },
      })),
      onVideoEvent: vi.fn(() => () => {}),
      projectList: vi.fn(async () => ({ success: true, value: [] })),
    },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Default export folders and export help', () => {
  it('loads the default, supports temporary overrides, and reuses the default on a new session', async () => {
    values.videoOutputDirectory = '/default';
    const first = renderHook(() => useOutputDirectory(report));
    await waitFor(() => expect(first.result.current.output).toBe('/default'));
    await waitFor(() => expect(first.result.current.outputChecking).toBe(false));
    await act(async () => {
      await first.result.current.chooseOutput();
    });
    expect(first.result.current.output).toBe('/chosen');
    await act(async () => {
      await window.api.settingsSet({ key: 'videoOutputDirectory', value: '/new-default' });
    });
    expect(first.result.current.output).toBe('/chosen');
    act(() => first.result.current.resetOutput());
    await waitFor(() => expect(first.result.current.output).toBe('/new-default'));
    first.unmount();
    const reopened = renderHook(() => useOutputDirectory(report));
    await waitFor(() => expect(reopened.result.current.output).toBe('/new-default'));
  });
  it('chooses and clears the persisted setting using the native folder picker', async () => {
    const { result } = renderHook(() => useDefaultExportDirectory(), { wrapper: ToastProvider });
    await act(async () => {
      await result.current.choose();
    });
    expect(window.api.dialogOpenFile).toHaveBeenCalledWith({
      title: 'Choose default export folder',
      directory: true,
    });
    expect(window.api.settingsSet).toHaveBeenCalledWith({
      key: 'videoOutputDirectory',
      value: '/chosen',
    });
    expect(result.current.directory).toBe('/chosen');
    await act(async () => {
      await result.current.clear();
    });
    expect(values.videoOutputDirectory).toBe('');
    expect(result.current.directory).toBe('');
  });
  it('ignores late folder checks after another destination has been selected', async () => {
    let finish!: (result: VideoResult<string>) => void;
    vi.mocked(window.api.videoCheckOutput).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    vi.mocked(window.api.dialogOpenFile)
      .mockResolvedValueOnce({ canceled: false, filePaths: ['/first'] })
      .mockResolvedValueOnce({ canceled: false, filePaths: ['/second'] });
    const { result } = renderHook(() => useOutputDirectory(report));
    await act(async () => {
      await result.current.chooseOutput();
    });
    await act(async () => {
      await result.current.chooseOutput();
    });
    await waitFor(() => expect(result.current.outputChecking).toBe(false));
    await act(async () => {
      finish({ success: false, error: 'Old folder error' });
    });
    expect(result.current.output).toBe('/second');
    expect(result.current.outputError).toBe('');
    expect(result.current.outputChecking).toBe(false);
  });
  it('shows the missing requirements when hovering over the disabled export button', async () => {
    const view = render(<StudioScreen />, { wrapper: ToastProvider });
    await waitFor(() =>
      expect(view.getByText('FFmpeg ready · Files stay on this computer')).toBeTruthy(),
    );
    const button = view.getByRole('button', { name: 'Export 0 clips' });
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.className).toContain('disabled:pointer-events-none');
    const target = view.getByLabelText('Export unavailable');
    fireEvent.pointerMove(target, { pointerType: 'mouse', clientX: 10, clientY: 10 });
    await waitFor(() =>
      expect(view.getByRole('tooltip').textContent).toContain('Choose an export folder'),
    );
    expect(view.getByRole('tooltip').textContent).toContain('Import a video');
    fireEvent.pointerLeave(target);
    fireEvent.focus(target);
    await waitFor(() => expect(view.getByRole('tooltip')).toBeTruthy());
  });
});
