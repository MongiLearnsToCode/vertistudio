import type { LogLevel, LogEntry, ModuleLogger } from './log-types';
import { LOG_LEVEL_PRIORITY } from './log-types';
import type { LoggingConfig } from './log-config';
import { LogWriter } from './log-writer';

// Sentry is optional — import only when enabled.
// Users must install @sentry/electron to use Sentry features.
let Sentry: typeof import('@sentry/electron/main') | null = null;

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  fatal: '\x1b[35m',
};
const RESET = '\x1b[0m';

class LogEngine {
  private config: LoggingConfig | null = null;
  private writer: LogWriter | null = null;
  private initialized = false;
  private sentryReady = false;

  /**
   * Initialize Sentry. Must be called BEFORE app.whenReady().
   * No-op if Sentry is disabled in config or DSN is not set.
   */
  async initSentry(dsn: string | undefined, appVersion: string, isProduction: boolean): Promise<void> {
    if (!dsn) return;

    try {
      Sentry = await import('@sentry/electron/main');
      Sentry.init({
        dsn,
        release: `${appVersion}`,
        environment: isProduction ? 'production' : 'development',
      });
      this.sentryReady = true;
    } catch {
      // @sentry/electron not installed — Sentry features disabled
      console.warn('[LogEngine] @sentry/electron not installed. Sentry disabled.');
    }
  }

  /**
   * Initialize the log engine with file writing and console output.
   * Call after app.whenReady().
   */
  async init(config: LoggingConfig, logDir: string): Promise<void> {
    if (this.initialized) return;
    this.config = config;

    if (config.fileEnabled) {
      this.writer = new LogWriter(logDir, config);
      await this.writer.init();
    }

    this.initialized = true;
  }

  debug(module: string, message: string, context?: Record<string, unknown>): void {
    this.log('debug', module, message, undefined, context);
  }

  info(module: string, message: string, context?: Record<string, unknown>): void {
    this.log('info', module, message, undefined, context);
  }

  warn(module: string, message: string, context?: Record<string, unknown>): void {
    this.log('warn', module, message, undefined, context);
  }

  error(module: string, message: string, error?: unknown, context?: Record<string, unknown>): void {
    this.log('error', module, message, error, context);
  }

  fatal(module: string, message: string, error?: unknown, context?: Record<string, unknown>): void {
    this.log('fatal', module, message, error, context);
    this.flush().catch(() => {});
  }

  /**
   * Ingest a pre-formed log entry (e.g. from the renderer process via IPC).
   */
  ingest(entry: LogEntry): void {
    if (!this.initialized || !this.config) return;
    if (LOG_LEVEL_PRIORITY[entry.level] < LOG_LEVEL_PRIORITY[this.config.minLevel]) return;

    if (this.config.fileEnabled) this.writer?.append(entry);
    if (this.config.consoleEnabled) this.consoleOutput(entry);
    if (this.config.sentryEnabled) this.sentryDispatch(entry);
  }

  /**
   * Create a module-scoped logger. Use this in your services and handlers:
   *
   *   const log = logEngine.createLogger('MyService');
   *   log.info('Started');
   *   log.error('Failed', err, { userId: 123 });
   */
  createLogger(module: string): ModuleLogger {
    return {
      debug: (message, context?) => this.debug(module, message, context),
      info: (message, context?) => this.info(module, message, context),
      warn: (message, context?) => this.warn(module, message, context),
      error: (message, error?, context?) => this.error(module, message, error, context),
      fatal: (message, error?, context?) => this.fatal(module, message, error, context),
    };
  }

  async flush(): Promise<void> {
    await this.writer?.flush();
  }

  /** Directory holding the rotated log files, or null if file logging is off. */
  getLogDir(): string | null {
    return this.writer?.getLogDir() ?? null;
  }

  /** Path to the day's current log file, or null if file logging is off. */
  getCurrentLogFilePath(): string | null {
    return this.writer?.getCurrentFilePath() ?? null;
  }

  async shutdown(): Promise<void> {
    await this.writer?.shutdown();
    this.initialized = false;
  }

  private log(
    level: LogLevel,
    module: string,
    message: string,
    error?: unknown,
    context?: Record<string, unknown>,
  ): void {
    if (!this.initialized || !this.config) {
      console.log(`[${module}] ${message}`);
      return;
    }

    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.config.minLevel]) return;

    const entry: LogEntry = {
      level,
      module,
      message,
      timestamp: new Date().toISOString(),
      process: 'main',
    };
    if (context) entry.context = context;
    if (error) entry.error = this.normalizeError(error);

    if (this.config.fileEnabled) this.writer?.append(entry);
    if (this.config.consoleEnabled) this.consoleOutput(entry);
    if (this.config.sentryEnabled) this.sentryDispatch(entry);
  }

  private consoleOutput(entry: LogEntry): void {
    const color = LEVEL_COLORS[entry.level];
    const prefix = `${color}[${entry.level.toUpperCase()}]${RESET} [${entry.module}]`;
    const msg = `${prefix} ${entry.message}`;

    if (entry.level === 'error' || entry.level === 'fatal') {
      console.error(msg, entry.error?.stack ?? '');
    } else if (entry.level === 'warn') {
      console.warn(msg);
    } else {
      console.log(msg);
    }
  }

  private sentryDispatch(entry: LogEntry): void {
    if (!this.sentryReady || !Sentry) return;

    const tags = { module: entry.module, process: entry.process };
    const extras = entry.context ?? {};

    switch (entry.level) {
      case 'warn':
        Sentry.addBreadcrumb({
          level: 'warning',
          category: entry.module,
          message: entry.message,
          data: extras,
        });
        break;
      case 'error':
      case 'fatal': {
        const severity = entry.level === 'fatal' ? 'fatal' : 'error';
        if (entry.error) {
          const err = new Error(entry.error.message);
          err.name = entry.error.name;
          if (entry.error.stack) err.stack = entry.error.stack;
          Sentry.captureException(err, { level: severity, tags, extra: extras });
        } else {
          Sentry.captureMessage(entry.message, { level: severity, tags, extra: extras });
        }
        break;
      }
    }
  }

  private normalizeError(error: unknown): { name: string; message: string; stack?: string } {
    if (error instanceof Error) {
      return { name: error.name, message: error.message, stack: error.stack };
    }
    return { name: 'Error', message: String(error) };
  }
}

export const logEngine = new LogEngine();
