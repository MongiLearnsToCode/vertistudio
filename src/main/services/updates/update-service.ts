import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import electronUpdater from 'electron-updater';
import { z } from 'zod';
import { IPC } from '@shared/ipc/channels';
import { settingsStore } from '../settings-store';
import { videoService } from '../video/video-service';
import { logEngine } from '@logging/index';
import { UpdateController } from './update-controller';

const log = logEngine.createLogger('Updates');
const releaseSchema = z.object({ macSigned: z.boolean() });
let controller: UpdateController;
export function initUpdates() {
  let disabled: string | undefined;
  let manualDownloadUrl: string | undefined;
  if (!app.isPackaged || !fs.existsSync(path.join(process.resourcesPath, 'app-update.yml')))
    disabled =
      'Automatic updates are available in the installed release. This local build is updated by rebuilding it.';
  if (!disabled && process.platform === 'darwin') {
    try {
      const config = releaseSchema.parse(
        JSON.parse(fs.readFileSync(path.join(process.resourcesPath, 'release.json'), 'utf8')),
      );
      if (!config.macSigned)
        manualDownloadUrl = `https://vertistudio.clipverti.com/download/mac-${process.arch}`;
    } catch (error) {
      log.warn('macOS signing information unavailable', { error: String(error) });
      manualDownloadUrl = `https://vertistudio.clipverti.com/download/mac-${process.arch}`;
    }
  }
  const updater = disabled ? undefined : electronUpdater.autoUpdater;
  if (updater) {
    updater.autoDownload = false;
    updater.allowPrerelease = false;
    updater.allowDowngrade = false;
    updater.logger = {
      info: (message) => log.info(String(message)),
      warn: (message) => log.warn(String(message)),
      error: (message) => log.error(String(message)),
      debug: (message) => log.debug(String(message)),
    };
  }
  controller = new UpdateController(
    {
      check: async () => {
        await updater?.checkForUpdates();
      },
      download: async () => {
        await updater?.downloadUpdate();
      },
      install: () => {
        setImmediate(() => updater?.quitAndInstall(false, true));
      },
      setAutomatic: (enabled) => {
        if (updater) updater.autoInstallOnAppQuit = enabled && process.platform !== 'linux';
      },
    },
    app.getVersion(),
    disabled,
    (state) => {
      for (const win of BrowserWindow.getAllWindows())
        if (!win.isDestroyed()) win.webContents.send(IPC.UPDATE_CHANGED, state);
    },
    () => !videoService.isExporting,
    manualDownloadUrl,
  );
  updater?.on('update-available', (info) => controller.available(info.version));
  updater?.on('update-not-available', () => controller.current());
  updater?.on('download-progress', (info) => controller.progress(info.percent));
  updater?.on('update-downloaded', (info) => controller.downloaded(info.version));
  updater?.on('error', (error) => {
    log.error('Update failed', error);
    controller.failed(error);
  });
  controller.configure(settingsStore.get('automaticUpdates'));
  settingsStore.onChange((event) => {
    if (event.key === 'automaticUpdates') controller.configure(Boolean(event.value));
  });
  if (!disabled) {
    const check = () => {
      void controller
        .check()
        .catch((error) => log.warn('Background update check failed', { error: String(error) }));
    };
    const startup = setTimeout(check, 15000);
    startup.unref();
    const periodic = setInterval(check, 6 * 60 * 60 * 1000);
    periodic.unref();
    app.once('will-quit', () => {
      clearTimeout(startup);
      clearInterval(periodic);
    });
  }
}
export function getUpdates() {
  if (!controller) throw new Error('Updates have not initialized.');
  return controller;
}
