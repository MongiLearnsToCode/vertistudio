import { FolderOpen, Trash2, Film, X, Play } from 'lucide-react';
import { Button, IconButton } from '@shared/components';
import { Icon } from '@renderer/components/Icon';
import { timecode, formatBytes, estimateBytes } from '@shared/video/timecode';
import type { StudioController } from '../hooks/useStudio';
export function VideoQueue({ studio }: { studio: StudioController }) {
  return (
    <section aria-label="Video queue" className="space-y-2">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-medium text-text-primary">
          Queue <span className="text-text-muted">({studio.items.length})</span>
        </h2>
        <span className="text-xs text-text-muted">
          {studio.items.filter((item) => item.status === 'done').length} exported
        </span>
      </div>
      <ul className="space-y-2">
        {studio.items.map((item, index) => (
          <li
            key={item.id}
            className={`rounded-lg border bg-app-surface p-3 ${studio.selectedId === item.id ? 'border-accent' : 'border-border'}`}
          >
            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                aria-label={`Cut ${item.video.name}`}
                aria-pressed={studio.selectedId === item.id}
                onClick={() => studio.setSelectedId(item.id)}
              >
                {item.video.thumbnail ? (
                  <img
                    src={item.video.thumbnail}
                    alt=""
                    className="w-12 h-12 rounded object-cover"
                  />
                ) : (
                  <span className="w-12 h-12 rounded bg-app-base grid place-items-center shrink-0">
                    <Icon icon={Film} size={20} className="text-text-muted" />
                  </span>
                )}
                <span className="min-w-0">
                  <strong className="block text-xs font-medium text-text-primary truncate">
                    Short {index + 1} · {item.video.name}
                  </strong>
                  <span className="block text-[11px] text-text-muted mt-1">
                    {item.video.width} × {item.video.height} · {item.video.fps.toFixed(2)} fps ·{' '}
                    {item.video.videoCodec} · {formatBytes(item.video.size)}
                    {item.video.hasAudio ? '' : ' · No audio'}
                  </span>
                  <span className="block text-[11px] text-text-secondary font-mono mt-1">
                    {timecode(item.trim.start)} → {timecode(item.trim.end)}
                  </span>
                </span>
              </button>
              <IconButton
                label="Reveal in folder"
                aria-label="Reveal in folder"
                icon={<Icon icon={FolderOpen} size={14} />}
                onClick={() => void studio.reveal(item)}
              />
              {item.status === 'encoding' ? (
                <IconButton
                  label="Cancel export"
                  aria-label="Cancel export"
                  icon={<Icon icon={X} size={14} />}
                  onClick={() => void studio.cancel(item.id)}
                />
              ) : (
                <IconButton
                  label="Remove video"
                  aria-label="Remove video"
                  disabled={studio.running || studio.projects.working}
                  icon={<Icon icon={Trash2} size={14} />}
                  onClick={() => studio.remove(item.id)}
                />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-text-muted">
              <span
                className={
                  item.status === 'error'
                    ? 'text-accent-red'
                    : item.status === 'done'
                      ? 'text-accent-green'
                      : ''
                }
                role="status"
              >
                {item.status === 'encoding'
                  ? `Encoding${item.exportFormat ? ` ${item.exportFormat}` : ''} ${item.percent.toFixed(0)}%${item.speed ? ` · ${item.speed}` : ''}`
                  : item.status === 'done'
                    ? `Exported · ${formatBytes(item.outputSize ?? 0)}`
                    : item.status === 'error'
                      ? item.error || 'Export failed'
                      : item.status === 'canceled'
                        ? 'Canceled'
                        : `Ready · ~${formatBytes(estimateBytes(item.trim.end - item.trim.start, studio.preset) * (studio.both ? 2 : 1))}`}
              </span>
              {item.status === 'done' || item.status === 'error' || item.status === 'canceled' ? (
                <Button
                  variant="secondary"
                  disabled={studio.running || studio.projects.working}
                  onClick={() => studio.changeTrim(item.id, item.trim)}
                >
                  Queue again
                </Button>
              ) : null}
              {item.outputs?.map((output) => (
                <Button
                  key={output.path}
                  variant="secondary"
                  onClick={() => void studio.open({ ...item, output: output.path })}
                >
                  <Icon icon={Play} size={12} className="mr-1" />
                  Open {output.format}
                </Button>
              ))}
              {item.status === 'done' && !item.outputs?.length ? (
                <Button variant="secondary" onClick={() => void studio.open(item)}>
                  <Icon icon={Play} size={12} className="mr-1" />
                  Open export
                </Button>
              ) : null}
            </div>
            {item.status === 'encoding' ? (
              <div
                role="progressbar"
                aria-label="Export progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(item.percent)}
                className="mt-2 h-1 bg-app-base rounded overflow-hidden"
              >
                <div
                  className="h-full bg-accent transition-[width]"
                  style={{ width: `${item.percent}%` }}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
