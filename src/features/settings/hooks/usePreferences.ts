import { useAppInfo } from '@renderer/hooks/useAppInfo';
import { useSetting } from '@renderer/hooks/useSetting';
import { useTheme } from '@renderer/contexts/ThemeContext';
import { useToast } from '@renderer/contexts/ToastContext';
import { useLogger } from '@renderer/hooks/useLogger';
import type { ThemePreference } from '@shared/ipc/types';
export function usePreferences() {
  const info = useAppInfo();
  const theme = useTheme();
  const [density, saveDensity] = useSetting('density');
  const { showToast } = useToast();
  const log = useLogger('Preferences');
  const report = (error: unknown) => {
    log.error('Saving preference failed', error);
    showToast('Could not save your preference.', 'error');
  };
  return {
    info,
    theme: theme.preference,
    density,
    setTheme: (value: ThemePreference) => {
      void theme.setPreference(value).catch(report);
    },
    setDensity: (value: typeof density) => {
      void saveDensity(value).catch(report);
    },
  };
}
