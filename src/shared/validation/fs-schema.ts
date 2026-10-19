import { z } from 'zod';

const encodingSchema = z.enum(['utf8', 'base64']);
const pathSchema = z.string().min(1).max(4096);

export const fsReadRequestSchema = z.object({
  path: pathSchema,
  encoding: encodingSchema.optional(),
});

export const fsWriteRequestSchema = z.object({
  path: pathSchema,
  // Cap raw payload at the IPC layer. The fs-service applies a separate,
  // lower default for the on-disk byte cap once the encoding is known.
  content: z.string().max(50 * 1024 * 1024),
  encoding: encodingSchema.optional(),
  exclusive: z.boolean().optional(),
});

export const fsListRequestSchema = z.object({
  path: pathSchema,
});

export const fsStatRequestSchema = z.object({
  path: pathSchema,
});
