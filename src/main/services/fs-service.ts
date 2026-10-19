import path from 'path';
import { app } from 'electron';
import { promises as fsp } from 'fs';
import { logEngine } from '../../logging';
import type {
  FsEncoding,
  FsListEntry,
  FsListResponse,
  FsReadResponse,
  FsStatResponse,
  FsWriteResponse,
} from '@shared/ipc/fs-types';

const log = logEngine.createLogger('FsService');

// Conservative defaults — buyers who need bigger payloads can raise these.
// Keep both r/w caps in step with the Zod schema's outer cap.
const MAX_READ_BYTES = 10 * 1024 * 1024;
const MAX_WRITE_BYTES = 10 * 1024 * 1024;

/**
 * Path security model
 *
 * Two origins are trusted, per the project security rules:
 *   1. Anything under `app.getPath('userData')` (always).
 *   2. Paths the user picked via a native dialog or dragged into the app
 *      (recorded as "blessed" in this service).
 *
 * Symlinks ARE resolved before the allow-list check (via `fs.realpath`).
 * Without this, a renderer blessed on a directory could traverse a symlink
 * inside it (planted by a separate process) to reach `/etc/passwd` or
 * `~/.ssh/id_rsa`. For non-existent targets (fs.write of a new file), we
 * realpath the parent directory and rejoin with the basename so the check
 * still hits the canonical path.
 */
class FsService {
  private blessed: Set<string> = new Set();
  private isWin = process.platform === 'win32';

  /**
   * Mark an absolute path as user-chosen. Children of a blessed
   * directory are also accepted. Idempotent.
   */
  bless(absolutePath: string): void {
    if (!path.isAbsolute(absolutePath)) {
      log.warn('Skipped blessing non-absolute path', { path: absolutePath });
      return;
    }
    const normalized = this.normalize(absolutePath);
    if (this.blessed.has(normalized)) return;
    this.blessed.add(normalized);
    log.debug('Blessed path', { path: normalized, total: this.blessed.size });
  }

  isAllowed(p: string): boolean {
    const normalized = this.normalize(p);
    if (this.isWithin(this.normalize(app.getPath('userData')), normalized)) return true;
    for (const blessedPath of this.blessed) {
      if (normalized === blessedPath) return true;
      if (this.isWithin(blessedPath, normalized)) return true;
    }
    return false;
  }

  async read(p: string, encoding: FsEncoding = 'utf8'): Promise<FsReadResponse> {
    const abs = this.resolve(p);
    const real = await this.canonicalize(abs);
    if (!real || !this.isAllowed(real)) {
      return { success: false, error: 'Path is outside the allow-list', code: 'forbidden' };
    }
    try {
      const stats = await fsp.stat(real);
      if (!stats.isFile()) {
        return { success: false, error: 'Not a regular file', code: 'not-a-file' };
      }
      if (stats.size > MAX_READ_BYTES) {
        return {
          success: false,
          error: `File exceeds ${MAX_READ_BYTES} bytes (size ${stats.size})`,
          code: 'too-large',
        };
      }
      const buf = await fsp.readFile(real);
      const content = encoding === 'base64' ? buf.toString('base64') : buf.toString('utf8');
      return { success: true, content, encoding, size: stats.size };
    } catch (err) {
      if (this.isENoEnt(err)) {
        return { success: false, error: 'File not found', code: 'not-found' };
      }
      log.error('fs.read failed', err, { path: real });
      return { success: false, error: String(err), code: 'unknown' };
    }
  }

  async write(
    p: string,
    content: string,
    encoding: FsEncoding = 'utf8',
    exclusive = false,
  ): Promise<FsWriteResponse> {
    const abs = this.resolve(p);
    const real = await this.canonicalize(abs);
    if (!real || !this.isAllowed(real)) {
      return { success: false, error: 'Path is outside the allow-list', code: 'forbidden' };
    }
    try {
      const buf = Buffer.from(content, encoding);
      if (buf.byteLength > MAX_WRITE_BYTES) {
        return {
          success: false,
          error: `Content exceeds ${MAX_WRITE_BYTES} bytes (got ${buf.byteLength})`,
          code: 'too-large',
        };
      }
      await fsp.mkdir(path.dirname(real), { recursive: true });
      await fsp.writeFile(real, buf, { flag: exclusive ? 'wx' : 'w' });
      return { success: true, bytesWritten: buf.byteLength };
    } catch (err) {
      if (this.isEExist(err)) {
        return { success: false, error: 'File already exists', code: 'exists' };
      }
      log.error('fs.write failed', err, { path: real });
      return { success: false, error: String(err), code: 'unknown' };
    }
  }

  async list(p: string): Promise<FsListResponse> {
    const abs = this.resolve(p);
    const real = await this.canonicalize(abs);
    if (!real || !this.isAllowed(real)) {
      return { success: false, error: 'Path is outside the allow-list', code: 'forbidden' };
    }
    try {
      const stats = await fsp.stat(real);
      if (!stats.isDirectory()) {
        return { success: false, error: 'Not a directory', code: 'not-a-directory' };
      }
      const dirents = await fsp.readdir(real, { withFileTypes: true });
      const entries: FsListEntry[] = await Promise.all(
        dirents.map(async (d) => {
          const childPath = path.join(real, d.name);
          let size = 0;
          if (d.isFile()) {
            try {
              const s = await fsp.stat(childPath);
              size = s.size;
            } catch {
              size = 0;
            }
          }
          return {
            name: d.name,
            isFile: d.isFile(),
            isDirectory: d.isDirectory(),
            size,
          };
        }),
      );
      return { success: true, entries };
    } catch (err) {
      if (this.isENoEnt(err)) {
        return { success: false, error: 'Directory not found', code: 'not-found' };
      }
      log.error('fs.list failed', err, { path: real });
      return { success: false, error: String(err), code: 'unknown' };
    }
  }

  async stat(p: string): Promise<FsStatResponse> {
    const abs = this.resolve(p);
    const real = await this.canonicalize(abs);
    if (!real || !this.isAllowed(real)) {
      return { success: false, error: 'Path is outside the allow-list', code: 'forbidden' };
    }
    try {
      const s = await fsp.stat(real);
      return {
        success: true,
        exists: true,
        isFile: s.isFile(),
        isDirectory: s.isDirectory(),
        size: s.size,
        mtimeMs: s.mtimeMs,
      };
    } catch (err) {
      if (this.isENoEnt(err)) {
        return {
          success: true,
          exists: false,
          isFile: false,
          isDirectory: false,
          size: 0,
          mtimeMs: 0,
        };
      }
      log.error('fs.stat failed', err, { path: real });
      return { success: false, error: String(err), code: 'unknown' };
    }
  }

  // ----- internals -----

  /**
   * Resolve symlinks before the allow-list check. Returns null when the
   * path's parent directory does not resolve (genuinely missing or denied).
   * For paths that don't exist yet (fs.write of a new file), we realpath
   * the parent directory and rejoin with the basename — the check still
   * lands on the canonical path even for files that aren't there yet.
   */
  private async canonicalize(absolutePath: string): Promise<string | null> {
    try {
      return this.normalize(await fsp.realpath(absolutePath));
    } catch (err) {
      if (!this.isENoEnt(err)) {
        log.warn('canonicalize failed', { path: absolutePath, err: String(err) });
        return null;
      }
    }
    // Path doesn't exist — realpath the parent and rejoin.
    const parent = path.dirname(absolutePath);
    const base = path.basename(absolutePath);
    try {
      const realParent = await fsp.realpath(parent);
      return this.normalize(path.join(realParent, base));
    } catch (err) {
      if (this.isENoEnt(err)) {
        // Parent also missing — let the caller's mkdir/write attempt create
        // it (under userData); fall back to the literal-resolved path.
        return this.normalize(absolutePath);
      }
      log.warn('canonicalize parent failed', { path: absolutePath, err: String(err) });
      return null;
    }
  }

  private resolve(p: string): string {
    return this.normalize(path.resolve(p));
  }

  private normalize(p: string): string {
    return this.isWin ? p.toLowerCase() : p;
  }

  private isWithin(parent: string, child: string): boolean {
    if (parent === child) return true;
    const rel = path.relative(parent, child);
    return rel.length > 0 && !rel.startsWith('..') && !path.isAbsolute(rel);
  }

  private isENoEnt(err: unknown): boolean {
    return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'ENOENT';
  }

  private isEExist(err: unknown): boolean {
    return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'EEXIST';
  }

  // For tests
  __resetBlessed(): void {
    this.blessed.clear();
  }
}

export const fsService = new FsService();
export const FS_LIMITS = {
  MAX_READ_BYTES,
  MAX_WRITE_BYTES,
} as const;
