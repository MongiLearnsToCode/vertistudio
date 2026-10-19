import { BrowserWindow } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { logEngine } from '../../logging';
import { popupAppMenuFor } from '../menu/app-menu';
import { menuShowWindowMenuRequestSchema } from '@shared/validation/menu-schema';
import type { MenuShowWindowMenuRequest } from '@shared/ipc/types';

const log = logEngine.createLogger('MenuHandlers');

export function handleMenuShowWindowMenu(
  event: IpcMainInvokeEvent,
  data: MenuShowWindowMenuRequest,
): void {
  try {
    const parsed = menuShowWindowMenuRequestSchema.parse(data ?? {});
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      log.warn('menu:show-window-menu: no sender window');
      return;
    }
    popupAppMenuFor(win, parsed.x, parsed.y);
  } catch (err) {
    log.error('handleMenuShowWindowMenu failed', err, { data });
  }
}
