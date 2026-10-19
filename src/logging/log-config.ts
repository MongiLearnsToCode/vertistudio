import type { LogLevel } from './log-types';

/**
 * Logging configuration for the application.
 *
 * Edit this file to enable/disable logging outputs:
 * - console: Colored terminal output (always recommended during development)
 * - file:    JSON log files written to {userData}/logs/ with rotation and cleanup
 * - sentry:  Error reporting to Sentry (requires DSN in VITE_SENTRY_DSN env var)
 *
 * Combinations:
 *   console only          → consoleEnabled: true,  fileEnabled: false, sentryEnabled: false
 *   console + file        → consoleEnabled: true,  fileEnabled: true,  sentryEnabled: false
 *   console + sentry      → consoleEnabled: true,  fileEnabled: false, sentryEnabled: true
 *   all three             → consoleEnabled: true,  fileEnabled: true,  sentryEnabled: true
 *   file + sentry (prod)  → consoleEnabled: false, fileEnabled: true,  sentryEnabled: true
 */
export interface LoggingConfig {
  /** Minimum log level to process. Logs below this level are dropped. */
  minLevel: LogLevel;

  /** Enable colored console output (stdout/stderr). */
  consoleEnabled: boolean;

  /** Enable writing JSON log files to disk. */
  fileEnabled: boolean;

  /** Log file prefix (files named: {prefix}-YYYY-MM-DD.log). */
  filePrefix: string;

  /** Maximum log file size in MB before rotation. */
  maxFileSizeMB: number;

  /** Delete log files older than this many days. */
  maxAgeDays: number;

  /** How often to flush buffered log entries to disk (ms). */
  flushIntervalMs: number;

  /** Enable Sentry error reporting. Requires VITE_SENTRY_DSN env var. */
  sentryEnabled: boolean;
}

/**
 * Default development config: console + file, no Sentry.
 */
const devConfig: LoggingConfig = {
  minLevel: 'debug',
  consoleEnabled: true,
  fileEnabled: true,
  filePrefix: 'app',
  maxFileSizeMB: 10,
  maxAgeDays: 7,
  flushIntervalMs: 1000,
  sentryEnabled: false,
};

/**
 * Default production config: file + Sentry (if DSN set), no console.
 */
const prodConfig: LoggingConfig = {
  minLevel: 'info',
  consoleEnabled: false,
  fileEnabled: true,
  filePrefix: 'app',
  maxFileSizeMB: 10,
  maxAgeDays: 14,
  flushIntervalMs: 1000,
  sentryEnabled: true,
};

/**
 * Returns the logging config for the current environment.
 * Override by editing devConfig / prodConfig above.
 */
export function getLoggingConfig(isProduction: boolean): LoggingConfig {
  return isProduction ? { ...prodConfig } : { ...devConfig };
}
