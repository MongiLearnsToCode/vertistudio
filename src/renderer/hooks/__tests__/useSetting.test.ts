// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSetting } from '../useSetting';

const settingsGet = vi.fn();
const settingsSet = vi.fn();
const onSettingsChange = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  onSettingsChange.mockReturnValue(() => {});
  (window as unknown as { api: unknown }).api = {
    settingsGet,
    settingsSet,
    onSettingsChange,
  };
});

describe('useSetting', () => {
  it('returns the default theme initially, then resolves to the stored value', async () => {
    settingsGet.mockResolvedValue({ value: 'dark' });

    const { result } = renderHook(() => useSetting('theme'));

    expect(result.current[0]).toBe('system');

    await waitFor(() => {
      expect(result.current[0]).toBe('dark');
    });

    expect(settingsGet).toHaveBeenCalledWith({ key: 'theme' });
  });

  it('setSetting forwards the value through window.api.settingsSet', async () => {
    settingsGet.mockResolvedValue({ value: 'system' });
    settingsSet.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useSetting('theme'));
    await waitFor(() => expect(settingsGet).toHaveBeenCalled());

    await act(async () => {
      await result.current[1]('light');
    });

    expect(settingsSet).toHaveBeenCalledWith({ key: 'theme', value: 'light' });
  });

  it('setSetting rejects when the IPC reports failure', async () => {
    settingsGet.mockResolvedValue({ value: 'system' });
    settingsSet.mockResolvedValue({ success: false, error: 'boom' });

    const { result } = renderHook(() => useSetting('theme'));
    await waitFor(() => expect(settingsGet).toHaveBeenCalled());

    await expect(result.current[1]('light')).rejects.toThrow('boom');
  });
});
