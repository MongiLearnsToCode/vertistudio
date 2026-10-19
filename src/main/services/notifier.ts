import { BrowserWindow, Notification } from 'electron';
import { logEngine } from '../../logging';
import type { NotificationShowRequest } from '@shared/ipc/types';

const log = logEngine.createLogger('Notifier');

// Token-bucket rate limit per BrowserWindow. Without this gate a compromised
// renderer could spam notification.show() in a tight loop and bury legitimate
// alerts on macOS / Windows. Conservative defaults — buyers tune as needed.
const NOTIFICATION_BURST = 3;
const NOTIFICATION_REFILL_PER_SEC = 10 / 60; // 10 per minute sustained

interface TokenBucket {
  tokens: number;
  lastRefillMs: number;
}

export interface ShowResult {
  shown: boolean;
}

class NotifierService {
  // Keyed by webContents.id — one bucket per window. Bucket is created on
  // first call and lives until the window closes (a few entries; not worth
  // an explicit cleanup hook).
  private buckets = new Map<number, TokenBucket>();

  isSupported(): boolean {
    return Notification.isSupported();
  }

  show(input: NotificationShowRequest, originatorWindow?: BrowserWindow): ShowResult {
    if (!this.isSupported()) {
      log.warn('Notifications not supported on this system');
      return { shown: false };
    }

    const senderId = originatorWindow?.webContents?.id;
    if (senderId !== undefined && !this.consumeToken(senderId)) {
      log.warn('Notification rate-limited', { senderId });
      return { shown: false };
    }

    const notification = new Notification({
      title: input.title,
      body: input.body ?? '',
      silent: input.silent ?? false,
      urgency: input.urgency ?? 'normal',
    });

    notification.on('click', () => {
      const target =
        originatorWindow && !originatorWindow.isDestroyed()
          ? originatorWindow
          : (BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()) ?? null);
      if (!target) return;
      if (target.isMinimized()) target.restore();
      target.show();
      target.focus();
    });

    notification.on('failed', (_event, error) => {
      log.warn('Notification failed', { error });
    });

    notification.show();
    return { shown: true };
  }

  private consumeToken(windowId: number): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(windowId);
    if (!bucket) {
      bucket = { tokens: NOTIFICATION_BURST, lastRefillMs: now };
      this.buckets.set(windowId, bucket);
    }
    const elapsedSec = Math.max(0, (now - bucket.lastRefillMs) / 1000);
    bucket.tokens = Math.min(
      NOTIFICATION_BURST,
      bucket.tokens + elapsedSec * NOTIFICATION_REFILL_PER_SEC,
    );
    bucket.lastRefillMs = now;
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }
    return false;
  }
}

export const notifier = new NotifierService();
