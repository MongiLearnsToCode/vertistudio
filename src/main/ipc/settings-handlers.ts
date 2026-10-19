import { exportDirectory } from '@main/services/default-export-directory';
import { logEngine } from '../../logging';
import { settingsStore } from '../services/settings-store';
import {
  APP_SETTINGS_DEFAULTS,
  settingsGetRequestSchema,
  settingsSetRequestSchema,
  type AppSettingKey,
  type AppSettings,
} from '@shared/validation/settings-schema';
import type {
  SettingsGetRequest,
  SettingsGetResponse,
  SettingsSetRequest,
  SettingsSetResponse,
  SettingsResetResponse,
} from '@shared/ipc/types';
import { toIpcError } from './error-utils';

const log = logEngine.createLogger('SettingsHandlers');

const settingsDefaults = APP_SETTINGS_DEFAULTS;

export async function handleSettingsGet(
  _event: Electron.IpcMainInvokeEvent,
  data: SettingsGetRequest,
): Promise<SettingsGetResponse> {
  try {
    const parsed = settingsGetRequestSchema.parse(data);
    const key = parsed.key as AppSettingKey;
    const value = settingsStore.get(key);
    return { value };
  } catch (err) {
    log.error('handleSettingsGet failed', err, { key: data?.key });
    // Fall back to the schema default for the requested key when possible
    // — the renderer's type expects a value, not undefined. If the key
    // itself was malformed there is no default to return; emit undefined.
    const fallbackKey = data?.key as AppSettingKey | undefined;
    const value =
      fallbackKey && fallbackKey in settingsDefaults
        ? settingsDefaults[fallbackKey]
        : (undefined as unknown as AppSettings[AppSettingKey]);
    return { value };
  }
}

export async function handleSettingsSet(
  _event: Electron.IpcMainInvokeEvent,
  data: SettingsSetRequest,
): Promise<SettingsSetResponse> {
  try {
    const parsed = settingsSetRequestSchema.parse(data);
    const key = parsed.key as AppSettingKey;
    if (key === 'videoOutputDirectory') await exportDirectory.setDefault(parsed.value as string);
    else settingsStore.set(key, parsed.value as AppSettings[AppSettingKey]);
    return { success: true };
  } catch (err) {
    log.error('handleSettingsSet failed', err, { key: data?.key });
    return { success: false, error: toIpcError(err).error };
  }
}

export async function handleSettingsReset(): Promise<SettingsResetResponse> {
  try {
    settingsStore.reset();
    return { success: true };
  } catch (err) {
    log.error('handleSettingsReset failed', err);
    return { success: false, error: toIpcError(err).error };
  }
}
