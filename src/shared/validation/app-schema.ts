import { z } from 'zod';

const pathSchema = z.string().min(1).max(4096);

export const appShowInFolderRequestSchema = z.object({
  path: pathSchema,
});

export const appOpenPathRequestSchema = z.object({
  path: pathSchema,
});

// Restrict app:open-external to user-facing protocols. Without this gate,
// shell.openExternal would happily route file:, javascript:, data:, vbscript:,
// and arbitrary OS-level custom protocols to the user's browser / launcher.
const ALLOWED_OPEN_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

export const appOpenExternalRequestSchema = z.object({
  url: z
    .string()
    .min(1)
    .max(2048)
    .refine(
      (s) => {
        try {
          const parsed = new URL(s);
          return ALLOWED_OPEN_EXTERNAL_PROTOCOLS.has(parsed.protocol);
        } catch {
          return false;
        }
      },
      { message: 'URL must use http:, https:, or mailto:' },
    ),
});
