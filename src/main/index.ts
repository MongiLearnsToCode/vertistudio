import { initUpdates } from './services/updates/update-service';
import { registerVideoProtocol } from './security/video-protocol';
import { videoService } from './services/video/video-service';
import { app, BrowserWindow, dialog, Menu } from 'electron';
import path from 'path';
import { buildAppMenu } from './menu/app-menu';
import { registerAllIPC } from './ipc/register';
import { settingsStore } from './services/settings-store';
import { secretStore } from './services/secret-store';
import { themeService } from './services/theme-service';
import { createWindowState } from './services/window-state';
import { logEngine, getLoggingConfig } from '../logging';
import { EnvValidationError, parseMainEnv } from '@shared/env/env-schema';
import { registerCSP } from './security/csp';
import { registerPermissionHandler } from './security/permissions';
import { attachNavigationGuards } from './security/navigation';
import { attachCrashHandler } from './reliability/crash-handler';
import { attachWindowMaximizeWatcher } from './ipc/window-handlers';

try {
  parseMainEnv({ ...process.env, ...import.meta.env });
} catch (err) {
  if (err instanceof EnvValidationError) {
    dialog.showErrorBox('Invalid environment configuration', err.message);
  } else {
    dialog.showErrorBox('Startup failed', String(err));
  }
  app.exit(1);
}

app.setName('Verti Studio');
app.setPath('userData', path.join(app.getPath('appData'), 'Verti Studio'));
const isProduction = app.isPackaged;
const loggingConfig = getLoggingConfig(isProduction);

// Sentry must init before app 'ready'. No-op unless VITE_SENTRY_DSN is set
// and @sentry/electron is installed.
if (loggingConfig.sentryEnabled) {
  logEngine.initSentry(import.meta.env.VITE_SENTRY_DSN, app.getVersion(), isProduction);
}

// Windows: AppUserModelID is the source name on native toasts and the taskbar
// grouping. electron-builder sets it at install time; this covers dev runs.
if (process.platform === 'win32') {
  app.setAppUserModelId(app.getName());
}

// One running copy. A second launch focuses the first window instead.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

function createWindow(): BrowserWindow {
  const isMac = process.platform === 'darwin';
  const windowState = createWindowState({ defaultWidth: 1200, defaultHeight: 800 });

  const win = new BrowserWindow({
    show: false,
    icon: path.join(__dirname, '../../resources/icon.png'),
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1a1a1e',
    // Custom title bar: traffic lights on Mac, frameless + our own buttons elsewhere.
    ...(isMac
      ? { titleBarStyle: 'hidden', trafficLightPosition: { x: 12, y: 10 } }
      : { frame: false }),
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  windowState.manage(win);
  attachNavigationGuards(win.webContents);
  attachCrashHandler(win);
  attachWindowMaximizeWatcher(win);

  // DevTools in development: Ctrl+Shift+I / Cmd+Option+I or F12.
  win.webContents.on('before-input-event', (_event, input) => {
    if (app.isPackaged) return;
    const key = input.key.toLowerCase();
    const ctrlOrCmd = isMac ? input.meta : input.control;
    const modifier = isMac ? input.alt : input.shift;
    if ((ctrlOrCmd && modifier && key === 'i') || key === 'f12') {
      win.webContents.toggleDevTools();
    }
  });

  win.once('ready-to-show', () => win.show());

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return win;
}

if (gotSingleInstanceLock) {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    // Lock the userData dir to 0o700 on POSIX before anything writes to it
    // (logs, secrets, settings), so other users on a shared box can't read it.
    if (process.platform !== 'win32') {
      try {
        const { chmod, mkdir } = await import('fs/promises');
        const userDataDir = app.getPath('userData');
        await mkdir(userDataDir, { recursive: true, mode: 0o700 });
        await chmod(userDataDir, 0o700);
      } catch (err) {
        console.warn('[startup] Failed to lock userData dir to 0o700:', err);
      }
    }

    await logEngine.init(loggingConfig, path.join(app.getPath('userData'), 'logs'));
    const log = logEngine.createLogger('App');
    log.info('Application starting', {
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
    });

    await settingsStore.init();
    await secretStore.init();
    themeService.init();

    registerCSP(isProduction);
    registerVideoProtocol();
    registerPermissionHandler();
    registerAllIPC();
    Menu.setApplicationMenu(buildAppMenu());
    createWindow();
    initUpdates();
    log.info('Window created');
  });

  app.on('will-quit', async () => {
    videoService.cleanup();
    await logEngine.shutdown();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
