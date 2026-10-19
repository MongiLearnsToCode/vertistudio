import { logEngine } from '../../logging';
import { secretStore } from '../services/secret-store';
import {
  secretDeleteRequestSchema,
  secretHasRequestSchema,
  secretSetRequestSchema,
} from '@shared/validation/secret-schema';
import type {
  SecretDeleteRequest,
  SecretDeleteResponse,
  SecretHasRequest,
  SecretHasResponse,
  SecretSetRequest,
  SecretSetResponse,
  SecretStatusResponse,
} from '@shared/ipc/types';
import { toIpcError } from './error-utils';

const log = logEngine.createLogger('SecretHandlers');

/** Masked form for display: first 4 and last 4 characters. */
export function maskSecret(value: string): string {
  if (value.length <= 8) return '****';
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

// The renderer can ask whether a secret exists and see a masked preview.
// It can never read the raw value: services in the main process read it.
export async function handleSecretHas(
  _event: Electron.IpcMainInvokeEvent,
  data: SecretHasRequest,
): Promise<SecretHasResponse> {
  try {
    const { key } = secretHasRequestSchema.parse(data);
    const value = secretStore.get(key);
    return value ? { present: true, preview: maskSecret(value) } : { present: false, preview: null };
  } catch (err) {
    log.error('handleSecretHas failed', err, { key: data?.key });
    return { present: false, preview: null };
  }
}

export async function handleSecretSet(
  _event: Electron.IpcMainInvokeEvent,
  data: SecretSetRequest,
): Promise<SecretSetResponse> {
  try {
    const { key, value } = secretSetRequestSchema.parse(data);
    await secretStore.set(key, value);
    return { success: true };
  } catch (err) {
    log.error('handleSecretSet failed', err, { key: data?.key });
    return { success: false, ...toIpcError(err) };
  }
}

export async function handleSecretStatus(): Promise<SecretStatusResponse> {
  return {
    encryptionAvailable: secretStore.isEncryptionAvailable(),
    platform: process.platform,
  };
}

export async function handleSecretDelete(
  _event: Electron.IpcMainInvokeEvent,
  data: SecretDeleteRequest,
): Promise<SecretDeleteResponse> {
  try {
    const { key } = secretDeleteRequestSchema.parse(data);
    await secretStore.delete(key);
    return { success: true };
  } catch (err) {
    log.error('handleSecretDelete failed', err, { key: data?.key });
    return { success: false, ...toIpcError(err) };
  }
}
