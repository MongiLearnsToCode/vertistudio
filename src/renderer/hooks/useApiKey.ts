import { useCallback, useEffect, useState } from 'react';
import { useLogger } from './useLogger';

export type ApiKeyState =
  | { kind: 'loading' }
  | { kind: 'present'; preview: string }
  | { kind: 'absent' };

export interface UseApiKeyResult {
  state: ApiKeyState;
  save: (raw: string) => Promise<{ success: boolean; error?: string }>;
  remove: () => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

/**
 * Store, remove, and check an API key by provider name ('anthropic' -> secret
 * `apikey_anthropic`). The raw key is never read back into the renderer: the
 * main process keeps it, and this hook only ever sees a masked preview.
 */
export function useApiKey(name: string): UseApiKeyResult {
  const [state, setState] = useState<ApiKeyState>({ kind: 'loading' });
  const log = useLogger('useApiKey');
  const storeKey = `apikey_${name}`;

  const refresh = useCallback(async () => {
    try {
      const res = await window.api.secretHas({ key: storeKey });
      setState(res.present && res.preview ? { kind: 'present', preview: res.preview } : { kind: 'absent' });
    } catch (err) {
      log.error('secretHas failed', err, { name });
      setState({ kind: 'absent' });
    }
  }, [storeKey, name, log]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (raw: string): Promise<{ success: boolean; error?: string }> => {
      const trimmed = raw.trim();
      if (!trimmed) return { success: false, error: 'Key is empty' };
      try {
        const res = await window.api.secretSet({ key: storeKey, value: trimmed });
        if (!res.success) return { success: false, error: res.error };
        await refresh();
        return { success: true };
      } catch (err) {
        log.error('secretSet failed', err, { name });
        return { success: false, error: String(err) };
      }
    },
    [storeKey, name, log, refresh],
  );

  const remove = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await window.api.secretDelete({ key: storeKey });
      if (!res.success) return { success: false, error: res.error };
      setState({ kind: 'absent' });
      return { success: true };
    } catch (err) {
      log.error('secretDelete failed', err, { name });
      return { success: false, error: String(err) };
    }
  }, [storeKey, name, log]);

  return { state, save, remove, refresh };
}
