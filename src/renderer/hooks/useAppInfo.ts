import { useEffect, useState } from 'react';
import type { AppGetInfoResponse } from '@shared/ipc/types';

let cache: AppGetInfoResponse | null = null;
let inflight: Promise<AppGetInfoResponse> | null = null;

/**
 * Returns app metadata (name, version, electron/chrome/node versions,
 * build hash, etc). Fetches once per process via `app:get-info` and
 * caches at module scope, so multiple consumers (StatusBar, HomeScreen,
 * About panel) share a single IPC call.
 *
 * Returns `null` during the brief mount → fetch window. Consumers
 * should render a fallback (`info?.name ?? '...'`) for that frame.
 */
export function useAppInfo(): AppGetInfoResponse | null {
  const [info, setInfo] = useState<AppGetInfoResponse | null>(cache);

  useEffect(() => {
    if (cache) return;
    if (!inflight) inflight = window.api.appGetInfo();
    let cancelled = false;
    void inflight.then((res) => {
      cache = res;
      if (!cancelled) setInfo(res);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return info;
}
