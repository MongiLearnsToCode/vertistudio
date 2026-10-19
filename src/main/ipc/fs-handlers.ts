import { logEngine } from '../../logging';
import { fsService } from '../services/fs-service';
import { toIpcError } from './error-utils';
import {
  fsListRequestSchema,
  fsReadRequestSchema,
  fsStatRequestSchema,
  fsWriteRequestSchema,
} from '@shared/validation/fs-schema';
import type {
  FsListRequest,
  FsListResponse,
  FsReadRequest,
  FsReadResponse,
  FsStatRequest,
  FsStatResponse,
  FsWriteRequest,
  FsWriteResponse,
} from '@shared/ipc/fs-types';

const log = logEngine.createLogger('FsHandlers');

export async function handleFsRead(
  _event: Electron.IpcMainInvokeEvent,
  data: FsReadRequest,
): Promise<FsReadResponse> {
  try {
    const parsed = fsReadRequestSchema.parse(data);
    return await fsService.read(parsed.path, parsed.encoding ?? 'utf8');
  } catch (err) {
    log.error('fs:read schema parse failed', err);
    return { success: false, ...toIpcError(err) } as FsReadResponse;
  }
}

export async function handleFsWrite(
  _event: Electron.IpcMainInvokeEvent,
  data: FsWriteRequest,
): Promise<FsWriteResponse> {
  try {
    const parsed = fsWriteRequestSchema.parse(data);
    return await fsService.write(
      parsed.path,
      parsed.content,
      parsed.encoding ?? 'utf8',
      parsed.exclusive ?? false,
    );
  } catch (err) {
    log.error('fs:write schema parse failed', err);
    return { success: false, ...toIpcError(err) } as FsWriteResponse;
  }
}

export async function handleFsList(
  _event: Electron.IpcMainInvokeEvent,
  data: FsListRequest,
): Promise<FsListResponse> {
  try {
    const parsed = fsListRequestSchema.parse(data);
    return await fsService.list(parsed.path);
  } catch (err) {
    log.error('fs:list schema parse failed', err);
    return { success: false, ...toIpcError(err) } as FsListResponse;
  }
}

export async function handleFsStat(
  _event: Electron.IpcMainInvokeEvent,
  data: FsStatRequest,
): Promise<FsStatResponse> {
  try {
    const parsed = fsStatRequestSchema.parse(data);
    return await fsService.stat(parsed.path);
  } catch (err) {
    log.error('fs:stat schema parse failed', err);
    return { success: false, ...toIpcError(err) } as FsStatResponse;
  }
}
