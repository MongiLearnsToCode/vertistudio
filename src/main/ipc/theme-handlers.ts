import type { IpcMainInvokeEvent } from 'electron';
import { logEngine } from '../../logging';
import { themeService } from '../services/theme-service';
import { toIpcError } from './error-utils';
import { themeSetRequestSchema } from '@shared/validation/theme-schema';
import type { ThemeGetResponse, ThemeSetRequest, ThemeSetResponse } from '@shared/ipc/types';

const log = logEngine.createLogger('ThemeHandlers');

export function handleThemeGet(): ThemeGetResponse {
  return themeService.current();
}

export function handleThemeSet(
  _event: IpcMainInvokeEvent,
  data: ThemeSetRequest,
): ThemeSetResponse {
  try {
    const parsed = themeSetRequestSchema.parse(data);
    themeService.setPreference(parsed.preference);
    return { success: true };
  } catch (err) {
    log.error('handleThemeSet failed', err, { data });
    return { success: false, error: toIpcError(err).error };
  }
}
