import { z } from 'zod';

export const menuShowWindowMenuRequestSchema = z.object({
  x: z.number().int().nonnegative().optional(),
  y: z.number().int().nonnegative().optional(),
});
