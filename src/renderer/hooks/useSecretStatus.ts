import { useEffect, useState } from 'react';
import type { SecretStatusResponse } from '@shared/ipc/types';
import { useLogger } from './useLogger';

/**
 * Reports whether secret-store can encrypt at rest. False on Linux without
 * `gnome-keyring` / `kwallet` (safeStorage falls back to plaintext UTF-8).
 *
 * Returns null while the status is loading. The API Keys panel renders a
 * persistent warning banner when `encryptionAvailable === false` so the
 * user is not surprised to learn their saved keys are unprotected.
 */
export function useSecretStatus(): SecretStatusResponse | null {
  const [status, setStatus] = useState<SecretStatusResponse | null>(null);
  const log = useLogger('useSecretStatus');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await window.api.secretStatus();
        if (!cancelled) setStatus(res);
      } catch (err) {
        log.error('secretStatus failed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [log]);

  return status;
}
