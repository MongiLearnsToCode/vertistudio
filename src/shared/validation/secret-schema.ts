import { z } from 'zod';

const SECRET_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;

export const secretKeySchema = z
  .string()
  .min(1)
  .max(128)
  .regex(SECRET_KEY_PATTERN, 'Secret keys may only contain letters, digits, "_", and "-"');

export const secretValueSchema = z.string().max(64 * 1024);

export const secretHasRequestSchema = z.object({ key: secretKeySchema });
export const secretSetRequestSchema = z.object({ key: secretKeySchema, value: secretValueSchema });
export const secretDeleteRequestSchema = z.object({ key: secretKeySchema });
