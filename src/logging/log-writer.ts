import fs from 'fs/promises';
import path from 'path';
import type { LogEntry } from './log-types';
import type { LoggingConfig } from './log-config';

export class LogWriter {
  private buffer: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private currentDate = '';
  private currentFilePath = '';
  private logDir: string;
  private config: LoggingConfig;
  private flushing = false;

  constructor(logDir: string, config: LoggingConfig) {
    this.logDir = logDir;
    this.config = config;
  }

  async init(): Promise<void> {
    // Mode is best-effort — Windows ignores POSIX modes (ACL handles it),
    // userData on Linux/Mac is already a per-user dir, but locking the
    // log dir + files to 0o700 / 0o600 closes the gap on multi-user
    // boxes where another user has shell access (e.g. shared Linux dev
    // hosts, jump boxes).
    await fs.mkdir(this.logDir, { recursive: true, mode: 0o700 });
    if (process.platform !== 'win32') {
      try {
        await fs.chmod(this.logDir, 0o700);
      } catch (err) {
        console.error('[LogWriter] chmod logDir failed:', err);
      }
    }
    this.updateCurrentFile();

    this.flushTimer = setInterval(() => {
      this.flush().catch((err) => {
        console.error('[LogWriter] Flush failed:', err);
      });
    }, this.config.flushIntervalMs);

    this.cleanupOldLogs().catch(() => {});
    this.cleanupTimer = setInterval(
      () => {
        this.cleanupOldLogs().catch(() => {});
      },
      60 * 60 * 1000,
    );
  }

  append(entry: LogEntry): void {
    this.buffer.push(entry);
  }

  /** Path of the daily log file as of right now. Recomputes the date so
   *  callers immediately after a UTC-midnight rollover get the new path. */
  getCurrentFilePath(): string {
    this.updateCurrentFile();
    return this.currentFilePath;
  }

  getLogDir(): string {
    return this.logDir;
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0 || this.flushing) return;
    this.flushing = true;

    const entries = this.buffer.splice(0);
    try {
      this.updateCurrentFile();
      await this.rotateIfNeeded();

      const lines = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
      // mode: 0o600 only takes effect on file creation; a chmod on the
      // existing path closes the gap for log files created before this
      // change shipped (or by an older Electron version with looser
      // defaults). Best-effort: failure shouldn't drop log entries.
      await fs.appendFile(this.currentFilePath, lines, { encoding: 'utf-8', mode: 0o600 });
      if (process.platform !== 'win32') {
        try {
          await fs.chmod(this.currentFilePath, 0o600);
        } catch {
          // mode is enforced via appendFile on first creation; the chmod
          // is just defense-in-depth for stale files.
        }
      }
    } catch {
      this.buffer.unshift(...entries);
    } finally {
      this.flushing = false;
    }
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    await this.flush();
  }

  private updateCurrentFile(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.currentDate) {
      this.currentDate = today;
      this.currentFilePath = path.join(this.logDir, `${this.config.filePrefix}-${today}.log`);
    }
  }

  private async rotateIfNeeded(): Promise<void> {
    try {
      const stats = await fs.stat(this.currentFilePath);
      const sizeMB = stats.size / (1024 * 1024);
      if (sizeMB >= this.config.maxFileSizeMB) {
        let suffix = 1;
        while (true) {
          const rotatedPath = this.currentFilePath.replace('.log', `.${suffix}.log`);
          try {
            await fs.access(rotatedPath);
            suffix++;
          } catch {
            await fs.rename(this.currentFilePath, rotatedPath);
            break;
          }
        }
      }
    } catch {
      // File doesn't exist yet
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const files = await fs.readdir(this.logDir);
      const cutoff = Date.now() - this.config.maxAgeDays * 24 * 60 * 60 * 1000;
      const prefix = this.config.filePrefix + '-';

      for (const file of files) {
        if (!file.startsWith(prefix) || !file.endsWith('.log')) continue;
        const filePath = path.join(this.logDir, file);
        try {
          const stats = await fs.stat(filePath);
          if (stats.mtimeMs < cutoff) {
            await fs.unlink(filePath);
          }
        } catch {
          // Skip
        }
      }
    } catch {
      // Log dir might not exist yet
    }
  }
}
