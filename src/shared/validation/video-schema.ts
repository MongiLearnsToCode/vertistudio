import { z } from 'zod';
export const videoPathSchema = z.object({ path: z.string().min(1).max(32768) });
export const videoIdSchema = z.object({ id: z.string().uuid() });
export const videoTrimSchema = z
  .object({ start: z.number().finite().min(0), end: z.number().finite().positive() })
  .refine((value) => value.end > value.start, 'Out point must be after the in point');
export const videoExportSchema = videoIdSchema.extend({
  both: z.boolean().optional(),
  preset: z.enum(['balanced', 'quality', 'master']),
  fit: z.enum(['auto', 'keep', 'crop', 'pad', 'blur']),
  encoder: z.enum(['libx264', 'h264_nvenc', 'h264_qsv', 'h264_vaapi']),
  keepFps: z.boolean(),
  trim: videoTrimSchema,
  outputDirectory: z.string().min(1).max(32768),
});
