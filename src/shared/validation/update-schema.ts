import { z } from 'zod';
export const updateActionSchema = z.enum(['status', 'check', 'download', 'install']);
