import { BrowserWindow } from 'electron';
import { logEngine } from '../../logging';
import { IPC } from '@shared/ipc/channels';
import type { MenuAction, MenuActionEvent } from '@shared/ipc/types';

const log = logEngine.createLogger('MenuActions');

export function dispatchMenuAction(action: MenuAction, win?: BrowserWindow): void {
  const target = win ?? BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  if (!target || target.isDestroyed()) {
    log.warn('dispatchMenuAction: no target window', { action });
    return;
  }
  const payload: MenuActionEvent = { action };
  target.webContents.send(IPC.MENU_ACTION, payload);
}
