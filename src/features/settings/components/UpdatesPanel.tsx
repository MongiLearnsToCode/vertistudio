import { Button, Panel } from '@shared/components';
import { useUpdates } from '@renderer/hooks/useUpdates';
export function UpdatesPanel() {
  const updates = useUpdates();
  const state = updates.state;
  const unavailable = !state || ['disabled', 'checking', 'downloading'].includes(state.status);
  return (
    <Panel header="App updates">
      <div className="p-4 space-y-3 text-xs text-text-secondary">
        <p>
          Verti Studio {state?.currentVersion ?? '…'} checks for updates at startup and every six
          hours. Editing and exporting work offline.
        </p>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            className="accent-accent mt-0.5"
            checked={updates.automatic}
            disabled={state?.status === 'disabled' || Boolean(state?.manualDownloadUrl)}
            onChange={(event) => void updates.setAutomatic(event.target.checked)}
          />
          <span>
            Automatically download updates
            <span className="block text-text-muted mt-1">
              Windows and macOS install downloaded updates when you quit. Linux asks you to restart
              and may require your administrator password.
            </span>
          </span>
        </label>
        {state?.manualDownloadUrl ? (
          <p className="text-text-muted">
            This unsigned macOS build checks for new versions automatically. Download and install
            them manually; automatic installation requires an Apple-signed release.
          </p>
        ) : null}
        <p role="status">
          {state?.message ?? 'Loading update status…'}
          {state?.status === 'downloading' ? ` ${Math.floor(state.percent ?? 0)}%` : ''}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={unavailable || updates.busy || state?.status === 'downloaded'}
            onClick={() => void updates.check()}
          >
            Check for updates
          </Button>
          {state?.status === 'available' ? (
            <Button
              variant="primary"
              disabled={updates.busy}
              onClick={() => void updates.download()}
            >
              Download update
            </Button>
          ) : null}
          {state?.status === 'downloaded' ? (
            <Button
              variant="primary"
              disabled={updates.busy}
              onClick={() => void updates.install()}
            >
              Restart and install
            </Button>
          ) : null}
        </div>
        {updates.error ? (
          <p role="alert" className="text-accent-red">
            {updates.error}
          </p>
        ) : null}
      </div>
    </Panel>
  );
}
