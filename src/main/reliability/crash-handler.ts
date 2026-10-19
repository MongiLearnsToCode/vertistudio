import { app, BrowserWindow, dialog, type RenderProcessGoneDetails } from 'electron';
import { logEngine } from '../../logging';

// If the UI process crashes, log it and let the user reload or quit instead of
// staring at a blank window.

const log = logEngine.createLogger('CrashHandler');

const handling = new WeakSet<BrowserWindow>();

export function attachCrashHandler(window: BrowserWindow): void {
  window.webContents.on('render-process-gone', (_event, details) => {
    void handleRenderCrash(window, details);
  });
}

async function handleRenderCrash(
  window: BrowserWindow,
  details: RenderProcessGoneDetails,
): Promise<void> {
  if (details.reason === 'clean-exit') return;

  log.error('Renderer process gone', undefined, {
    reason: details.reason,
    exitCode: details.exitCode,
  });

  if (handling.has(window) || window.isDestroyed()) return;
  handling.add(window);

  try {
    const result = await dialog.showMessageBox(window, {
      type: 'error',
      buttons: ['Reload', 'Quit'],
      defaultId: 0,
      cancelId: 1,
      title: 'Application Error',
      message: 'The application has crashed.',
      detail: `Reason: ${details.reason}\nExit code: ${details.exitCode}\n\nThe logs folder has the details.`,
      noLink: true,
    });
    if (window.isDestroyed()) return;
    if (result.response === 0) {
      log.info('Recovery: reloading window after crash');
      window.webContents.reload();
    } else {
      log.info('Recovery: quitting after crash');
      app.quit();
    }
  } catch (err) {
    log.error('Recovery dialog failed', err);
  } finally {
    handling.delete(window);
  }
}
