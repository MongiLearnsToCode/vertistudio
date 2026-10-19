import { z } from 'zod';
import { themeSchema } from './settings-schema';

export const themeSetRequestSchema = z.object({
  preference: themeSchema,
});
