import { z } from 'zod';

// All outbound URLs must be HTTPS — accepting http:// here would let an
// MITM read events / spoof responses on hostile networks. Sentry's own
// collectors are HTTPS-only, but a buyer typo could ship http:// otherwise.
const httpsUrl = z
  .string()
  .url()
  .refine((s) => s.startsWith('https://'), { message: 'URL must use https://' });

const sharedEnvSchema = z.object({
  // Optional crash reporting. Absent => the Sentry hook in src/logging no-ops.
  VITE_SENTRY_DSN: httpsUrl.optional(),
});

export const mainEnvSchema = sharedEnvSchema.extend({
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
});

export const rendererEnvSchema = sharedEnvSchema;

export type MainEnv = z.infer<typeof mainEnvSchema>;
export type RendererEnv = z.infer<typeof rendererEnvSchema>;

export class EnvValidationError extends Error {
  readonly issues: { path: string; message: string }[];

  constructor(scope: 'main' | 'renderer', error: z.ZodError) {
    const issues = error.issues.map((issue) => ({
      path: issue.path.join('.') || '(root)',
      message: issue.message,
    }));
    const summary = issues.map((i) => `  • ${i.path}: ${i.message}`).join('\n');
    super(`Invalid ${scope}-process environment variables:\n${summary}`);
    this.name = 'EnvValidationError';
    this.issues = issues;
  }
}

export function parseMainEnv(source: Record<string, string | undefined>): MainEnv {
  const result = mainEnvSchema.safeParse(source);
  if (!result.success) throw new EnvValidationError('main', result.error);
  return result.data;
}

export function parseRendererEnv(source: Record<string, string | undefined>): RendererEnv {
  const result = rendererEnvSchema.safeParse(source);
  if (!result.success) throw new EnvValidationError('renderer', result.error);
  return result.data;
}
