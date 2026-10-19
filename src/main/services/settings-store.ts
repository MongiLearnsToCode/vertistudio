import { BrowserWindow } from 'electron';
import type Store from 'electron-store';
import { logEngine } from '../../logging';
import { IPC } from '@shared/ipc/channels';
import {
  APP_SETTINGS_DEFAULTS,
  type AppSettings,
  type AppSettingKey,
} from '@shared/validation/settings-schema';
import type { SettingsChangeEvent } from '@shared/ipc/types';

type SettingsStoreInstance = Store<AppSettings>;

const log = logEngine.createLogger('SettingsStore');

type SettingsChangeListener = (event: SettingsChangeEvent) => void;

class SettingsStore {
  private store: SettingsStoreInstance | null = null;
  private listeners: SettingsChangeListener[] = [];

  async init(): Promise<void> {
    if (this.store) return;

    const { default: ElectronStore } = await import('electron-store');
    this.store = new ElectronStore<AppSettings>({
      name: 'settings',
      defaults: APP_SETTINGS_DEFAULTS,
      clearInvalidConfig: true,
    });

    log.info('Settings store initialized', { path: this.store.path });
  }

  get<K extends AppSettingKey>(key: K): AppSettings[K] {
    return this.requireStore().get(key);
  }

  getAll(): AppSettings {
    return this.requireStore().store;
  }

  set<K extends AppSettingKey>(key: K, value: AppSettings[K]): void {
    this.requireStore().set(key, value);
    this.broadcastChange({ key, value });
  }

  reset(): void {
    const store = this.requireStore();
    store.clear();
    for (const k of Object.keys(APP_SETTINGS_DEFAULTS) as AppSettingKey[]) {
      this.broadcastChange({ key: k, value: APP_SETTINGS_DEFAULTS[k] });
    }
    log.info('Settings reset to defaults');
  }

  onChange(listener: SettingsChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private broadcastChange(event: SettingsChangeEvent): void {
    for (const window of BrowserWindow.getAllWindows()) {
      if (window.isDestroyed()) continue;
      window.webContents.send(IPC.SETTINGS_ON_CHANGE, event);
    }
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private requireStore(): SettingsStoreInstance {
    if (!this.store) {
      throw new Error('SettingsStore.init() must be called before use');
    }
    return this.store;
  }
}

export const settingsStore = new SettingsStore();
