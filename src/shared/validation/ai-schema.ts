import { z } from 'zod';

export const aiRequestIdSchema = z
  .string()
  .min(8, 'requestId is too short')
  .max(128, 'requestId is too long')
  .regex(/^[A-Za-z0-9_-]+$/, 'requestId must be alphanumeric with "_" or "-"');

export const aiPromptSchema = z
  .string()
  .min(1, 'Prompt cannot be empty')
  .max(64 * 1024, 'Prompt is too long (max 64 KB)');

export const aiModelSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_.:-]+$/, 'model contains invalid characters');

export const aiCompleteRequestSchema = z.object({
  requestId: aiRequestIdSchema,
  prompt: aiPromptSchema,
  system: z.string().max(32 * 1024, 'System prompt is too long (max 32 KB)').optional(),
  model: aiModelSchema.optional(),
  maxTokens: z.number().int().min(1).max(64000).optional(),
});

export const aiCancelRequestSchema = z.object({
  requestId: aiRequestIdSchema,
});
