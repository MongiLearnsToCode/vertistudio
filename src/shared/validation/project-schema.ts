import { z } from 'zod';
import { videoTrimSchema, videoExportSchema } from './video-schema';

export const projectOptionsSchema = videoExportSchema.pick({
  preset: true,
  fit: true,
  encoder: true,
  keepFps: true,
  both: true,
});
export const projectIdSchema = z.object({ id: z.string().uuid() });
export const projectSaveSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  cuts: z.array(z.object({ videoId: z.string().uuid(), trim: videoTrimSchema })).max(1000),
  options: projectOptionsSchema,
});
export const projectDocumentSchema = z.object({
  version: z.literal(1),
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  updatedAt: z.string().datetime(),
  sources: z
    .array(
      z.object({
        key: z.string().uuid(),
        extension: z
          .string()
          .regex(/^(\.[a-z0-9]{1,10})?$/i)
          .default(''),
        name: z.string(),
        originalPath: z.string(),
      }),
    )
    .max(1000),
  cuts: z.array(z.object({ source: z.string().uuid(), trim: videoTrimSchema })).max(1000),
  options: projectOptionsSchema,
});
