import { shell, type WebContents } from 'electron';
import { URL } from 'url';
import { logEngine } from '../../logging';

const log = logEngine.createLogger('Navigation');

function isInternalRendererUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'file:') return true;
    if (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function isOpenableExternal(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:';
  } catch {
    return false;
  }
}

export function attachNavigationGuards(webContents: WebContents): void {
  webContents.on('will-navigate', (event, url) => {
    if (isInternalRendererUrl(url)) return;
    event.preventDefault();
    log.warn('Blocked in-window navigation', { url });
    if (isOpenableExternal(url)) {
      void shell.openExternal(url);
    }
  });

  webContents.setWindowOpenHandler(({ url }) => {
    log.info('Blocked window.open / target=_blank', { url });
    if (isOpenableExternal(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  webContents.on('will-attach-webview', (event) => {
    log.warn('Blocked <webview> attach attempt');
    event.preventDefault();
  });
}
