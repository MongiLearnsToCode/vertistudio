import { z } from 'zod';

// Cap the number of paths a single drop can request — prevents a runaway
// loop if a directory of thousands of files is dropped. Buyers who need
// more should resolve in batches.
const MAX_DROP_PATHS = 256;
const MAX_PATH_LEN = 4096;

export const dndResolvePathsRequestSchema = z.object({
  paths: z.array(z.string().min(1).max(MAX_PATH_LEN)).max(MAX_DROP_PATHS),
});

export const dndBlessAndResolveRequestSchema = z.object({
  path: z.string().min(1).max(MAX_PATH_LEN),
});
