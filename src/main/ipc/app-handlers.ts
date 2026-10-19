import { app, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { logEngine } from '../../logging';
import { fsService } from '../services/fs-service';
import { toIpcError } from './error-utils';
import {
  appOpenExternalRequestSchema,
  appOpenPathRequestSchema,
  appShowInFolderRequestSchema,
} from '@shared/validation/app-schema';
import type {
  AppGetInfoResponse,
  AppOpenExternalRequest,
  AppOpenExternalResponse,
  AppOpenPathRequest,
  AppOpenPathResponse,
  AppShowInFolderRequest,
  AppShowInFolderResponse,
} from '@shared/ipc/types';

const log = logEngine.createLogger('AppHandlers');

interface PackageMetadata {
  homepage: string | null;
  description: string | null;
}

let packageMetadataCache: PackageMetadata | null = null;

function readPackageMetadata(): PackageMetadata {
  if (packageMetadataCache) return packageMetadataCache;
  try {
    const file = path.join(app.getAppPath(), 'package.json');
    const raw = fs.readFileSync(file, 'utf8');
    const pkg = JSON.parse(raw) as { homepage?: string; description?: string };
    packageMetadataCache = {
      homepage: typeof pkg.homepage === 'string' && pkg.homepage.length > 0 ? pkg.homepage : null,
      description:
        typeof pkg.description === 'string' && pkg.description.length > 0 ? pkg.description : null,
    };
  } catch (err) {
    log.warn('Failed to read package.json metadata', { err: String(err) });
    packageMetadataCache = { homepage: null, description: null };
  }
  return packageMetadataCache;
}

export async function handleAppGetInfo(): Promise<AppGetInfoResponse> {
  const meta = readPackageMetadata();
  return {
    version: app.getVersion(),
    name: app.getName(),
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    nodeVersion: process.versions.node,
    buildHash: __BUILD_HASH__,
    buildDate: __BUILD_DATE__,
    homepage: meta.homepage,
    description: meta.description,
  };
}

export async function handleAppOpenExternal(
  _event: Electron.IpcMainInvokeEvent,
  data: AppOpenExternalRequest,
): Promise<AppOpenExternalResponse> {
  try {
    const parsed = appOpenExternalRequestSchema.parse(data);
    await shell.openExternal(parsed.url);
    log.info('Opened external URL', { url: parsed.url });
    return { success: true };
  } catch (err) {
    log.error('Failed to open external URL', err, { url: data?.url });
    return { success: false, error: 'Failed to open URL' };
  }
}


// Same allow-list rationale as fs:* — paths are limited to userData and
// paths the user explicitly chose via dialog or drag-drop. The renderer
// could otherwise smuggle arbitrary paths through the shell helpers and
// reach files it shouldn't be touching.
function checkPathAllowed(p: string): { ok: true } | { ok: false; error: string } {
  if (!fsService.isAllowed(p)) {
    return { ok: false, error: 'Path is outside the allow-list' };
  }
  return { ok: true };
}

// Extensions that, when handed to shell.openPath, run code rather than
// open a viewer. A renderer with bless on a writable directory could
// fs:write a binary and then open it — chain becomes RCE. Buyers who need
// to ship an "open in default app" feature for a specific executable type
// remove the extension here and document why.
const DANGEROUS_OPEN_PATH_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.ps1',
  '.psm1',
  '.scr',
  '.msi',
  '.msp',
  '.app',
  '.command',
  '.sh',
  '.bash',
  '.zsh',
  '.lnk',
  '.jar',
  '.appimage',
  '.vbs',
  '.vbe',
  '.js', // shell.openPath on a .js file runs it via wscript on Windows.
  '.jse',
  '.wsf',
  '.pif',
]);

function isDangerousExtension(p: string): boolean {
  const ext = path.extname(p).toLowerCase();
  return DANGEROUS_OPEN_PATH_EXTENSIONS.has(ext);
}

export async function handleAppShowInFolder(
  _event: Electron.IpcMainInvokeEvent,
  data: AppShowInFolderRequest,
): Promise<AppShowInFolderResponse> {
  try {
    const parsed = appShowInFolderRequestSchema.parse(data);
    const guard = checkPathAllowed(parsed.path);
    if (!guard.ok) return { success: false, error: guard.error };
    shell.showItemInFolder(parsed.path);
    log.info('Showed item in folder', { path: parsed.path });
    return { success: true };
  } catch (err) {
    log.error('app:show-in-folder failed', err);
    return { success: false, error: toIpcError(err).error };
  }
}

export async function handleAppOpenPath(
  _event: Electron.IpcMainInvokeEvent,
  data: AppOpenPathRequest,
): Promise<AppOpenPathResponse> {
  try {
    const parsed = appOpenPathRequestSchema.parse(data);
    const guard = checkPathAllowed(parsed.path);
    if (!guard.ok) return { success: false, error: guard.error };
    if (isDangerousExtension(parsed.path)) {
      log.warn('Rejected app:open-path for executable extension', { path: parsed.path });
      return { success: false, error: 'Path extension is not permitted' };
    }
    // shell.openPath returns "" on success or an error message on failure.
    const errMsg = await shell.openPath(parsed.path);
    if (errMsg) {
      log.warn('shell.openPath returned error', { path: parsed.path, error: errMsg });
      return { success: false, error: errMsg };
    }
    log.info('Opened path with default app', { path: parsed.path });
    return { success: true };
  } catch (err) {
    log.error('app:open-path failed', err);
    return { success: false, error: toIpcError(err).error };
  }
}
