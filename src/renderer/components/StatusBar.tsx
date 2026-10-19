import { useAppInfo } from '@renderer/hooks/useAppInfo';

export function StatusBar() {
  const info = useAppInfo();

  return (
    <div
      className="flex items-center justify-between h-6 px-3 bg-app-deep text-text-dim shrink-0"
      style={{ borderTop: '0.5px solid var(--color-border)', fontSize: 10 }}
    >
      <span>
        {info?.name ?? '...'} v{info?.version ?? '...'}
      </span>
      <span>Local video editing · H.264 MP4 export</span>
    </div>
  );
}
