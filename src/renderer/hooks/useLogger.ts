import { useMemo } from 'react';
import type { LogSendRequest } from '@shared/ipc/types';

type LogLevel = LogSendRequest['level'];

export interface RendererLogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: unknown, context?: Record<string, unknown>): void;
  fatal(message: string, error?: unknown, context?: Record<string, unknown>): void;
}

function normalizeError(
  error: unknown,
): { name: string; message: string; stack?: string } | undefined {
  if (error == null) return undefined;
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { name: 'Error', message: String(error) };
}

function send(
  level: LogLevel,
  module: string,
  message: string,
  error: unknown,
  context: Record<string, unknown> | undefined,
): void {
  const payload: LogSendRequest = { level, module, message };
  if (context !== undefined) payload.context = context;
  const err = normalizeError(error);
  if (err) payload.error = err;
  void window.api?.logSend(payload).catch((e: unknown) => {
    console.error('[useLogger] logSend failed', e);
  });
}

export function useLogger(module: string): RendererLogger {
  return useMemo<RendererLogger>(
    () => ({
      debug: (message, context) => send('debug', module, message, undefined, context),
      info: (message, context) => send('info', module, message, undefined, context),
      warn: (message, context) => send('warn', module, message, undefined, context),
      error: (message, error, context) => send('error', module, message, error, context),
      fatal: (message, error, context) => send('fatal', module, message, error, context),
    }),
    [module],
  );
}
