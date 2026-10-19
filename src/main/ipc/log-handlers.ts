import { logEngine } from '../../logging';
import { logSendRequestSchema } from '@shared/validation/log-schema';
import type { LogSendRequest } from '@shared/ipc/types';
import type { LogEntry } from '../../logging';

const log = logEngine.createLogger('LogHandlers');

// Token-bucket rate limit per renderer. Without this gate a compromised
// renderer could fire log:send thousands of times per second with the 16 KiB
// max message; the file writer would chase the tail off the disk and push
// legitimate log lines out of `logs:tail`. Generous defaults — normal app
// logging never hits the cap; only abuse does.
const LOG_BURST = 500;
const LOG_REFILL_PER_SEC = 100;
const OVERFLOW_FLUSH_MS = 1000;

interface TokenBucket {
  tokens: number;
  lastRefillMs: number;
}

const buckets = new Map<number, TokenBucket>();
const overflowCount = new Map<number, number>();
const overflowTimer = new Map<number, NodeJS.Timeout>();

function consumeLogToken(senderId: number): boolean {
  const now = Date.now();
  let bucket = buckets.get(senderId);
  if (!bucket) {
    bucket = { tokens: LOG_BURST, lastRefillMs: now };
    buckets.set(senderId, bucket);
  }
  const elapsedSec = Math.max(0, (now - bucket.lastRefillMs) / 1000);
  bucket.tokens = Math.min(LOG_BURST, bucket.tokens + elapsedSec * LOG_REFILL_PER_SEC);
  bucket.lastRefillMs = now;
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }
  return false;
}

function noteOverflow(senderId: number): void {
  overflowCount.set(senderId, (overflowCount.get(senderId) ?? 0) + 1);
  if (overflowTimer.has(senderId)) return;
  const timer = setTimeout(() => {
    const dropped = overflowCount.get(senderId) ?? 0;
    overflowCount.delete(senderId);
    overflowTimer.delete(senderId);
    if (dropped > 0) {
      log.warn('Renderer log:send rate-limited', { senderId, dropped });
    }
  }, OVERFLOW_FLUSH_MS);
  overflowTimer.set(senderId, timer);
}

export async function handleLogSend(
  event: Electron.IpcMainInvokeEvent,
  data: LogSendRequest,
): Promise<void> {
  const senderId = event.sender.id;
  if (!consumeLogToken(senderId)) {
    noteOverflow(senderId);
    return;
  }
  const result = logSendRequestSchema.safeParse(data);
  if (!result.success) {
    log.warn('Rejected malformed log:send payload', { issues: result.error.issues });
    return;
  }
  const parsed = result.data;
  const entry: LogEntry = {
    level: parsed.level,
    module: parsed.module,
    message: parsed.message,
    timestamp: new Date().toISOString(),
    process: 'renderer',
    context: parsed.context,
    error: parsed.error,
  };
  logEngine.ingest(entry);
}
