import { useCallback, useEffect, useState } from 'react';
import type { UpdateResponse, UpdateState } from '@shared/ipc/update-types';
import { useSetting } from './useSetting';
import { useLogger } from './useLogger';
import { prepareForUpdate } from '../lib/update-preparation';
export function useUpdates() {
  const [state, setState] = useState<UpdateState>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [automatic, setAutomatic] = useSetting('automaticUpdates');
  const log = useLogger('Updates');
  useEffect(() => {
    let mounted = true;
    const off = window.api.onUpdateChanged((next) => {
      if (mounted) setState(next);
    });
    void window.api
      .updateStatus()
      .then((response) => {
        if (mounted) setState(response.state);
      })
      .catch((issue) => {
        log.error('Could not read update status', issue);
        if (mounted) setError(String(issue));
      });
    return () => {
      mounted = false;
      off();
    };
  }, [log]);
  const run = useCallback(
    async (action: () => Promise<UpdateResponse>, install = false) => {
      setBusy(true);
      setError('');
      try {
        if (install) await prepareForUpdate();
        const response = await action();
        setState(response.state);
        if (!response.success) throw new Error(response.error || 'Update failed.');
      } catch (issue) {
        log.error('Update action failed', issue);
        setError(issue instanceof Error ? issue.message : String(issue));
      } finally {
        setBusy(false);
      }
    },
    [log],
  );
  return {
    state,
    error,
    busy,
    automatic,
    check: () => run(() => window.api.updateCheck()),
    download: () =>
      run(async () => {
        if (!state?.manualDownloadUrl) return window.api.updateDownload();
        const response = await window.api.appOpenExternal({ url: state.manualDownloadUrl });
        return { ...response, state };
      }),
    install: () => run(() => window.api.updateInstall(), true),
    setAutomatic: async (value: boolean) => {
      try {
        await setAutomatic(value);
      } catch (issue) {
        log.error('Could not save update preference', issue);
        setError(String(issue));
      }
    },
  };
}
