import path from 'path';
import { stat } from 'fs/promises';
import { logEngine } from '../../logging';
import { fsService } from '../services/fs-service';
import {
  dndBlessAndResolveRequestSchema,
  dndResolvePathsRequestSchema,
} from '@shared/validation/dnd-schema';
import type {
  DndBlessAndResolveRequest,
  DndBlessAndResolveResponse,
  DndResolvePathsRequest,
  DndResolvePathsResponse,
  DndResolvedPath,
} from '@shared/ipc/types';

const log = logEngine.createLogger('DndHandlers');

async function resolveOne(p: string): Promise<DndResolvedPath> {
  const name = path.basename(p);
  try {
    const s = await stat(p);
    return {
      path: p,
      name,
      size: s.size,
      isFile: s.isFile(),
      isDirectory: s.isDirectory(),
      exists: true,
    };
  } catch {
    return {
      path: p,
      name,
      size: 0,
      isFile: false,
      isDirectory: false,
      exists: false,
    };
  }
}

// Metadata-only resolution. Does NOT bless paths — without that gate, a
// renderer could grant itself fs allow-list access by passing any string.
// Use `dnd:bless-and-resolve` (preload-internal) for the drop flow.
export async function handleDndResolvePaths(
  _event: Electron.IpcMainInvokeEvent,
  data: DndResolvePathsRequest,
): Promise<DndResolvePathsResponse> {
  try {
    const parsed = dndResolvePathsRequestSchema.parse(data);
    const resolved = await Promise.all(parsed.paths.map(resolveOne));
    log.debug('Resolved drop paths (metadata only)', {
      count: resolved.length,
      missing: resolved.filter((r) => !r.exists).length,
    });
    return { success: true, paths: resolved };
  } catch (err) {
    log.error('dnd:resolve-paths failed', err);
    return { success: false, paths: [], error: 'Failed to resolve paths' };
  }
}

// Preload-only — invoked from the `dndGetPathForFile` bridge after the
// preload obtains a real on-disk path via `webUtils.getPathForFile(file)`.
// `webUtils.getPathForFile` returns "" for any File the renderer might have
// synthesized, so reaching this handler with a non-empty path implies the
// path came from a genuine drop / file-input gesture. THAT is the provenance
// signal we use to bless. The renderer cannot reach this channel directly
// because it is not exposed on `window.api`.
export async function handleDndBlessAndResolve(
  _event: Electron.IpcMainInvokeEvent,
  data: DndBlessAndResolveRequest,
): Promise<DndBlessAndResolveResponse> {
  try {
    const parsed = dndBlessAndResolveRequestSchema.parse(data);
    const resolved = await resolveOne(parsed.path);
    if (resolved.exists) {
      fsService.bless(resolved.path);
    }
    return { success: true, resolved };
  } catch (err) {
    log.error('dnd:bless-and-resolve failed', err);
    const empty: DndResolvedPath = {
      path: '',
      name: '',
      size: 0,
      isFile: false,
      isDirectory: false,
      exists: false,
    };
    return { success: false, resolved: empty, error: 'Failed to resolve dropped file' };
  }
}
