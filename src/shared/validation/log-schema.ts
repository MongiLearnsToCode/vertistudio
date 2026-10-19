import { z } from 'zod';

const levelSchema = z.enum(['debug', 'info', 'warn', 'error', 'fatal']);

const errorShapeSchema = z.object({
  name: z.string().max(256),
  message: z.string().max(8192),
  stack: z.string().max(16384).optional(),
});

export const logSendRequestSchema = z.object({
  level: levelSchema,
  module: z.string().min(1).max(128),
  message: z.string().max(16384),
  context: z.record(z.string(), z.unknown()).optional(),
  error: errorShapeSchema.optional(),
});
