import { BrowserWindow, nativeTheme } from 'electron';
import { IPC } from '@shared/ipc/channels';
import { logEngine } from '../../logging';
import { settingsStore } from './settings-store';
import type {
  ResolvedTheme,
  ThemeChangeEvent,
  ThemePreference,
} from '@shared/ipc/types';

const log = logEngine.createLogger('ThemeService');

class ThemeService {
  init(): void {
    nativeTheme.on('updated', () => {
      if (settingsStore.get('theme') === 'system') {
        this.broadcast();
      }
    });
    settingsStore.onChange((event) => {
      if (event.key === 'theme') {
        this.broadcast();
      }
    });
    log.info('Theme service initialized', {
      preference: settingsStore.get('theme'),
      resolved: this.resolve(settingsStore.get('theme')),
      systemDark: nativeTheme.shouldUseDarkColors,
    });
  }

  resolve(preference: ThemePreference): ResolvedTheme {
    if (preference === 'system') {
      return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    }
    return preference;
  }

  current(): ThemeChangeEvent {
    const preference = settingsStore.get('theme');
    return { preference, resolved: this.resolve(preference) };
  }

  setPreference(preference: ThemePreference): void {
    // settingsStore.onChange listener (registered in init) will call broadcast()
    settingsStore.set('theme', preference);
  }

  private broadcast(): void {
    const event = this.current();
    for (const win of BrowserWindow.getAllWindows()) {
      if (win.isDestroyed()) continue;
      win.webContents.send(IPC.THEME_ON_CHANGE, event);
    }
  }
}

export const themeService = new ThemeService();
