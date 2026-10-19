import { BrowserWindow } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { logEngine } from '../../logging';
import { IPC } from '@shared/ipc/channels';
import type {
  WindowIsMaximizedResponse,
  WindowMaximizeChangeEvent,
} from '@shared/ipc/types';

const log = logEngine.createLogger('WindowHandlers');

function senderWindow(event: IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender);
}

export function handleWindowMinimize(event: IpcMainInvokeEvent): void {
  const win = senderWindow(event);
  if (!win) {
    log.warn('window:minimize received with no sender window');
    return;
  }
  win.minimize();
}

export function handleWindowMaximize(event: IpcMainInvokeEvent): void {
  const win = senderWindow(event);
  if (!win) {
    log.warn('window:maximize received with no sender window');
    return;
  }
  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
}

export function handleWindowClose(event: IpcMainInvokeEvent): void {
  const win = senderWindow(event);
  if (!win) {
    log.warn('window:close received with no sender window');
    return;
  }
  win.close();
}

export function handleWindowIsMaximized(
  event: IpcMainInvokeEvent,
): WindowIsMaximizedResponse {
  const win = senderWindow(event);
  return { isMaximized: win?.isMaximized() ?? false };
}

export function attachWindowMaximizeWatcher(win: BrowserWindow): void {
  const send = (isMaximized: boolean) => {
    if (win.isDestroyed()) return;
    const payload: WindowMaximizeChangeEvent = { isMaximized };
    win.webContents.send(IPC.WINDOW_ON_MAXIMIZE_CHANGE, payload);
  };

  win.on('maximize', () => send(true));
  win.on('unmaximize', () => send(false));
  win.on('enter-full-screen', () => send(true));
  win.on('leave-full-screen', () => send(false));
}
