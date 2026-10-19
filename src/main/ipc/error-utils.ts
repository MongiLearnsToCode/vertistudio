import { ZodError } from 'zod';

export interface IpcErrorInfo {
  error: string;
  code: string;
}

// Allow-list of human-friendly error messages that handlers / services raise
// intentionally and are safe to send back to the renderer. Anything else
// becomes the generic "Operation failed" — the alternative is leaking
// absolute paths, internal type names, and stack traces via `String(err)`.
const ALLOWED_ERROR_MESSAGES = new Set<string>([
  'Path is outside the allow-list',
  'Path is a directory',
  'Path is not a directory',
  'Not a regular file',
  'Not a directory',
  'File not found',
  'Directory not found',
  'File already exists',
  'Permission denied',
  'Resource busy',
  'Failed to open URL',
  'Failed to resolve paths',
  'Failed to resolve dropped file',
  'Failed to add recent file',
]);

/**
 * Convert an unknown thrown value into a renderer-safe `{ error, code }` pair.
 *
 * - Zod validation errors become `'Invalid request payload'` — never echo
 *   the issue list back to the renderer (that includes the raw input).
 * - Node fs/network errors get a generic message keyed off `errno.code` so
 *   absolute paths and host names don't cross the boundary.
 * - Plain Errors keep their message ONLY when it's on the allow-list above.
 *
 * Always log the full error main-side via `log.error('handlerName failed', err, ctx)`
 * BEFORE returning — the helper only handles the renderer-bound payload.
 */
export function toIpcError(err: unknown): IpcErrorInfo {
  if (err instanceof ZodError) {
    return { error: 'Invalid request payload', code: 'invalid-payload' };
  }

  if (typeof err === 'object' && err !== null && 'code' in err) {
    const errno = (err as NodeJS.ErrnoException).code;
    switch (errno) {
      case 'ENOENT':
        return { error: 'File not found', code: 'not-found' };
      case 'EACCES':
      case 'EPERM':
        return { error: 'Permission denied', code: 'forbidden' };
      case 'EBUSY':
        return { error: 'Resource busy', code: 'busy' };
      case 'EISDIR':
        return { error: 'Path is a directory', code: 'is-directory' };
      case 'ENOTDIR':
        return { error: 'Path is not a directory', code: 'not-a-directory' };
      case 'EEXIST':
        return { error: 'File already exists', code: 'exists' };
    }
  }

  if (err instanceof Error && ALLOWED_ERROR_MESSAGES.has(err.message)) {
    return { error: err.message, code: 'failed' };
  }

  return { error: 'Operation failed', code: 'failed' };
}
