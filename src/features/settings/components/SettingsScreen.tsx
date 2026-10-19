import { UpdatesPanel } from './UpdatesPanel';
import { useDefaultExportDirectory } from '@renderer/hooks/useDefaultExportDirectory';
import { Button, Panel } from '@shared/components';
import type { ThemePreference } from '@shared/ipc/types';
import { usePreferences } from '../hooks/usePreferences';
const themes: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'slate', label: 'Slate' },
  { value: 'midnight', label: 'Midnight' },
  { value: 'hc', label: 'High contrast' },
];
export function SettingsScreen() {
  const preferences = usePreferences();
  const exportFolder = useDefaultExportDirectory();
  return (
    <div className="flex flex-col h-full">
      <header className="h-10 px-4 flex items-center border-b border-border bg-app-surface text-[13px] text-text-primary font-medium">
        Settings
      </header>
      <div className="flex-1 overflow-auto p-5">
        <div className="max-w-xl space-y-5">
          <div>
            <h1 className="text-xl text-text-primary font-semibold">Make yourself at home.</h1>
            <p className="text-xs text-text-muted mt-1">Preferences are saved automatically.</p>
          </div>
          <Panel header="Appearance">
            <fieldset className="p-4 grid grid-cols-2 gap-3" aria-label="Appearance">
              {themes.map((theme) => (
                <label
                  key={theme.value}
                  className="flex gap-2 items-center text-xs text-text-secondary cursor-pointer"
                >
                  <input
                    type="radio"
                    name="theme"
                    className="accent-accent"
                    checked={preferences.theme === theme.value}
                    onChange={() => preferences.setTheme(theme.value)}
                  />
                  {theme.label}
                </label>
              ))}
            </fieldset>
          </Panel>
          <Panel header="Display density">
            <fieldset className="p-4 flex gap-5" aria-label="Display density">
              {(['comfortable', 'compact'] as const).map((density) => (
                <label
                  key={density}
                  className="flex gap-2 items-center text-xs text-text-secondary cursor-pointer"
                >
                  <input
                    type="radio"
                    name="density"
                    checked={preferences.density === density}
                    className="accent-accent"
                    onChange={() => preferences.setDensity(density)}
                  />
                  {density === 'comfortable' ? 'Comfortable' : 'Compact'}
                </label>
              ))}
            </fieldset>
          </Panel>
          <Panel header="Default export folder">
            <div className="p-4 space-y-3 text-xs text-text-secondary">
              <p>
                Save exported videos here by default. You can choose another folder for an
                individual export.
              </p>
              <p className="break-all text-text-primary" aria-label="Default export folder">
                {exportFolder.directory || 'No default folder selected'}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  disabled={exportFolder.choosing}
                  onClick={() => void exportFolder.choose()}
                >
                  {exportFolder.choosing ? 'Choosing…' : 'Choose default folder'}
                </Button>
                <Button
                  variant="secondary"
                  disabled={!exportFolder.directory || exportFolder.choosing}
                  onClick={() => void exportFolder.clear()}
                >
                  Clear default
                </Button>
              </div>
              {exportFolder.error ? (
                <p role="alert" className="text-accent-red">
                  {exportFolder.error}
                </p>
              ) : null}
            </div>
          </Panel>
          <UpdatesPanel />
          <Panel header="Verti Studio">
            <div className="p-4 space-y-3 text-xs text-text-secondary">
              <p>
                Version {preferences.info?.version ?? '…'} · A local video cutting and export
                studio.
              </p>
              <p>
                Import wide or vertical footage, select a clip, then export with crop, padding, a
                blurred background, or the original dimensions.
              </p>
              <p className="text-text-muted">
                Release installers include FFmpeg and FFprobe. No account, API key, or internet
                connection is needed to edit and export.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
