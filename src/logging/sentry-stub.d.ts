// Ambient stub for @sentry/electron — this package is optional. The real
// package types take precedence if it is installed (npm install @sentry/electron).
// This stub exists so the project type-checks even when Sentry is not installed.
declare module "@sentry/electron/main" {
  export function init(options: {
    dsn: string;
    release?: string;
    environment?: string;
  }): void;

  export function captureException(
    error: unknown,
    options?: {
      level?: "fatal" | "error" | "warning" | "info" | "debug";
      tags?: Record<string, string | undefined>;
      extra?: Record<string, unknown>;
    }
  ): void;

  export function captureMessage(
    message: string,
    options?: {
      level?: "fatal" | "error" | "warning" | "info" | "debug";
      tags?: Record<string, string | undefined>;
      extra?: Record<string, unknown>;
    }
  ): void;

  export function addBreadcrumb(breadcrumb: {
    level?: "fatal" | "error" | "warning" | "info" | "debug";
    category?: string;
    message?: string;
    data?: Record<string, unknown>;
  }): void;
}
