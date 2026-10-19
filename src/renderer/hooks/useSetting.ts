import { useCallback, useEffect, useState } from 'react';
import {
  APP_SETTINGS_DEFAULTS,
  type AppSettingKey,
  type AppSettings,
} from '@shared/validation/settings-schema';

export function useSetting<K extends AppSettingKey>(
  key: K,
): readonly [AppSettings[K], (next: AppSettings[K]) => Promise<void>] {
  const [value, setValue] = useState<AppSettings[K]>(APP_SETTINGS_DEFAULTS[key]);

  useEffect(() => {
    let cancelled = false;
    window.api.settingsGet({ key }).then(({ value: current }) => {
      if (!cancelled) setValue(current as AppSettings[K]);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    const unsubscribe = window.api.onSettingsChange((event) => {
      if (event.key === key) {
        setValue(event.value as AppSettings[K]);
      }
    });
    return unsubscribe;
  }, [key]);

  const setSetting = useCallback(
    async (next: AppSettings[K]): Promise<void> => {
      const res = await window.api.settingsSet({ key, value: next });
      if (!res.success) {
        throw new Error(res.error ?? 'Failed to set setting');
      }
    },
    [key],
  );

  return [value, setSetting] as const;
}
