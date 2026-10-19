import { BrowserWindow } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { logEngine } from '../../logging';
import { notifier } from '../services/notifier';
import { toIpcError } from './error-utils';
import { notificationShowRequestSchema } from '@shared/validation/notification-schema';
import type { NotificationShowRequest, NotificationShowResponse } from '@shared/ipc/types';

const log = logEngine.createLogger('NotificationHandlers');

export function handleNotificationShow(
  event: IpcMainInvokeEvent,
  data: NotificationShowRequest,
): NotificationShowResponse {
  try {
    const parsed = notificationShowRequestSchema.parse(data);
    const senderWin = BrowserWindow.fromWebContents(event.sender) ?? undefined;
    const result = notifier.show(parsed, senderWin);
    return { success: true, shown: result.shown };
  } catch (err) {
    log.error('handleNotificationShow failed', err, { data });
    return { success: false, shown: false, error: toIpcError(err).error };
  }
}
