import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => [],
  },
}));

vi.mock('../../../logging', () => ({
  logEngine: {
    createLogger: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
    }),
  },
}));

vi.mock('electron-store', () => {
  return {
    default: class MockStore<T extends Record<string, unknown>> {
      private data: T;
      private readonly defaults: T;
      readonly path = '/mock/settings.json';
      constructor(opts: { defaults: T }) {
        this.defaults = { ...opts.defaults };
        this.data = { ...opts.defaults };
      }
      get<K extends keyof T>(key: K): T[K] {
        return this.data[key];
      }
      set<K extends keyof T>(key: K, value: T[K]): void {
        this.data[key] = value;
      }
      get store(): T {
        return this.data;
      }
      clear(): void {
        this.data = { ...this.defaults };
      }
    },
  };
});

describe('settingsStore', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns the default theme before any set', async () => {
    const { settingsStore } = await import('../settings-store');
    await settingsStore.init();
    expect(settingsStore.get('theme')).toBe('system');
  });

  it('persists a set value and returns it on subsequent get', async () => {
    const { settingsStore } = await import('../settings-store');
    await settingsStore.init();
    settingsStore.set('theme', 'dark');
    expect(settingsStore.get('theme')).toBe('dark');
  });

  it('reset returns all settings to defaults', async () => {
    const { settingsStore } = await import('../settings-store');
    await settingsStore.init();
    settingsStore.set('theme', 'dark');
    settingsStore.reset();
    expect(settingsStore.get('theme')).toBe('system');
  });

  it('throws if used before init', async () => {
    const { settingsStore } = await import('../settings-store');
    expect(() => settingsStore.get('theme')).toThrow(/init\(\) must be called/);
  });
});
