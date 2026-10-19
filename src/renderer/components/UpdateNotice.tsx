import { Button } from '@shared/components';
import { useUpdates } from '../hooks/useUpdates';
export function UpdateNotice() {
  const updates = useUpdates();
  const state = updates.state;
  if (
    !state ||
    (!['available', 'downloading', 'downloaded'].includes(state.status) && !updates.error)
  )
    return null;
  return (
    <div
      className="flex flex-wrap items-center gap-3 px-4 py-2 border-b border-border bg-app-active text-xs text-text-primary"
      role="status"
    >
      <span className="flex-1">
        {state.message}
        {state.status === 'downloading' ? ` ${Math.floor(state.percent ?? 0)}%` : ''}
      </span>
      {state.status === 'available' ? (
        <Button variant="primary" disabled={updates.busy} onClick={() => void updates.download()}>
          Download update
        </Button>
      ) : null}
      {state.status === 'downloaded' ? (
        <Button variant="primary" disabled={updates.busy} onClick={() => void updates.install()}>
          {updates.busy ? 'Saving project…' : 'Restart and install'}
        </Button>
      ) : null}
      {state.status === 'error' && updates.error ? (
        <Button variant="secondary" disabled={updates.busy} onClick={() => void updates.check()}>
          Retry update check
        </Button>
      ) : null}
      {updates.error ? (
        <span role="alert" className="text-accent-red">
          {updates.error}
        </span>
      ) : null}
    </div>
  );
}
