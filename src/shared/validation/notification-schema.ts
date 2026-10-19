import { z } from 'zod';

export const notificationShowRequestSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(2000).optional(),
  silent: z.boolean().optional(),
  urgency: z.enum(['normal', 'critical', 'low']).optional(),
});
