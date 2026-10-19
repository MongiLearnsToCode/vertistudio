import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ResolvedTheme, ThemeChangeEvent, ThemePreference } from '@shared/ipc/types';
import type { AppSettings } from '@shared/validation/settings-schema';
import { useSetting } from '@renderer/hooks/useSetting';
import { useLogger } from '@renderer/hooks/useLogger';

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (next: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

function applyDataTheme(resolved: ResolvedTheme): void {
  document.documentElement.dataset.theme = resolved;
}

function applyDataDensity(density: AppSettings['density']): void {
  document.documentElement.dataset.density = density;
}

// Optimistic defaults so the Provider is in the tree on the very first
// render. Without these, components that call useTheme() before the
// initial IPC resolves (e.g. the onboarding wizard, which mounts on
// fresh-install before any other screen) crash with
// "useTheme must be used within a ThemeProvider".
const INITIAL_STATE: ThemeChangeEvent = {
  preference: 'system',
  resolved: 'dark',
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const log = useLogger('ThemeProvider');
  const [state, setState] = useState<ThemeChangeEvent>(INITIAL_STATE);
  const [density] = useSetting('density');

  useEffect(() => {
    let mounted = true;

    void window.api.themeGet().then((current) => {
      if (!mounted) return;
      setState(current);
      applyDataTheme(current.resolved);
    });

    const unsubscribe = window.api.onThemeChange((event) => {
      setState(event);
      applyDataTheme(event.resolved);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    applyDataDensity(density);
  }, [density]);

  const setPreference = useCallback(
    async (next: ThemePreference) => {
      const res = await window.api.themeSet({ preference: next });
      if (!res.success) {
        log.error('themeSet failed', null, { error: res.error, next });
      }
    },
    [log],
  );

  const value: ThemeContextValue = {
    preference: state.preference,
    resolved: state.resolved,
    setPreference,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
