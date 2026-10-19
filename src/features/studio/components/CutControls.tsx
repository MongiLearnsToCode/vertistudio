import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { Button, TextInput } from '@shared/components';
import { Icon } from '@renderer/components/Icon';
import { timecode, formatBytes } from '@shared/video/timecode';
import type { QueueItem } from '../types';
import type { useVideoCut } from '../hooks/useVideoCut';
interface Props {
  item: QueueItem;
  cut: ReturnType<typeof useVideoCut>;
  locked: boolean;
}
export function CutControls({ item, cut, locked }: Props) {
  return (
    <section
      aria-label="Video cutter"
      className="@container rounded-lg border border-border bg-app-surface overflow-hidden min-w-0"
    >
      <header className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border">
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-text-primary">Cut video</h2>
          <p className="text-xs text-text-muted truncate" title={item.video.path}>
            {item.video.name}
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={
            locked || (!cut.error && item.trim.start === 0 && item.trim.end === item.video.duration)
          }
          title="Use the full video, keeping the playhead where it is"
          onClick={cut.clearPoints}
        >
          <Icon icon={RotateCcw} size={12} className="mr-1" />
          Clear in/out
        </Button>
      </header>
      <p className="px-4 pt-3 text-xs text-text-muted">
        {item.video.width} × {item.video.height} · {item.video.fps.toFixed(2)} fps ·{' '}
        {item.video.videoCodec} · {formatBytes(item.video.size)}
        {item.video.hasAudio ? '' : ' · No audio'}
      </p>
      <fieldset disabled={locked} className="p-4 space-y-4 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            disabled={!cut.ready || locked}
            onClick={() => cut.step(-1)}
            aria-label="Previous frame"
          >
            <Icon icon={SkipBack} size={14} className="mr-1" />1 frame
          </Button>
          <Button
            variant="primary"
            disabled={!cut.ready || locked || Boolean(cut.error)}
            onClick={() => void cut.togglePlay()}
          >
            <Icon icon={cut.playing ? Pause : Play} size={14} className="mr-1" />
            {cut.playing ? 'Pause' : 'Play cut'}
          </Button>
          <Button
            variant="secondary"
            disabled={!cut.ready || locked}
            onClick={() => cut.step(1)}
            aria-label="Next frame"
          >
            1 frame
            <Icon icon={SkipForward} size={14} className="ml-1" />
          </Button>
          <output className="ml-auto font-mono text-xs text-text-primary">
            {timecode(cut.position)}
          </output>
        </div>
        <div>
          <label
            htmlFor="cut-playhead"
            className="flex justify-between gap-2 text-xs text-text-secondary"
          >
            <span>Playhead</span>
            <span className="text-text-muted">Drag or scroll to seek</span>
          </label>
          <div className="h-2 mt-3 mx-2 rounded bg-app-base overflow-hidden" aria-hidden="true">
            <div
              className="h-full bg-accent"
              style={{
                marginLeft: `${(item.trim.start / item.video.duration) * 100}%`,
                width: `${((item.trim.end - item.trim.start) / item.video.duration) * 100}%`,
              }}
            />
          </div>
          <input
            ref={cut.timelineRef}
            id="cut-playhead"
            aria-label="Playhead"
            type="range"
            min="0"
            max={item.video.duration}
            step="0.001"
            value={cut.position}
            disabled={!cut.ready || locked}
            aria-valuetext={timecode(cut.position)}
            onChange={(event) => cut.seek(Number(event.target.value))}
            className="w-full accent-accent cursor-ew-resize"
          />
          <div className="flex justify-between font-mono text-[10px] text-text-muted">
            <span>00:00:00.000</span>
            <span>{timecode(item.video.duration)}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {(['start', 'end'] as const).map((edge) => (
            <div key={edge} className="space-y-2 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor={`cut-${edge}`}
                  className="flex items-center gap-2 text-xs text-text-secondary"
                >
                  <span>{edge === 'start' ? 'In' : 'Out'}</span>
                  <span className="hidden @min-[600px]:inline text-text-muted">HH:MM:SS.mmm</span>
                </label>
                <Button
                  variant="secondary"
                  disabled={
                    locked ||
                    (!cut.error && item.trim[edge] === (edge === 'start' ? 0 : item.video.duration))
                  }
                  title={
                    edge === 'start'
                      ? 'Reset the in point to the beginning; keep the out point'
                      : 'Reset the out point to the end; keep the in point'
                  }
                  onClick={() => cut.clearPoint(edge)}
                >
                  Clear {edge === 'start' ? 'in' : 'out'}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <TextInput
                  id={`cut-${edge}`}
                  size="md"
                  className="flex-1 min-w-0 font-mono"
                  value={edge === 'start' ? cut.inText : cut.outText}
                  aria-invalid={Boolean(cut.error)}
                  aria-describedby="cut-error"
                  spellCheck={false}
                  onChange={(event) => cut.editTime(edge, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !cut.error) cut.seek(item.trim[edge]);
                  }}
                />
                <Button
                  variant="secondary"
                  size="md"
                  className="shrink-0 whitespace-nowrap"
                  aria-label={`Set ${edge === 'start' ? 'in' : 'out'} at playhead`}
                  title={`Set ${edge === 'start' ? 'in' : 'out'} at playhead`}
                  disabled={!cut.ready || locked}
                  onClick={() => cut.setPoint(edge)}
                >
                  Set {edge === 'start' ? 'in' : 'out'}
                  <span className="hidden @min-[600px]:inline">&nbsp;at playhead</span>
                </Button>
              </div>
              <input
                type="range"
                min="0"
                max={item.video.duration}
                step="0.001"
                value={item.trim[edge]}
                aria-label={edge === 'start' ? 'In point' : 'Out point'}
                className="w-full accent-accent cursor-ew-resize"
                onChange={(event) => cut.movePoint(edge, Number(event.target.value))}
              />
            </div>
          ))}
        </div>
        {cut.error ? (
          <p id="cut-error" role="alert" className="text-xs text-accent-red">
            {cut.error}
          </p>
        ) : (
          <p id="cut-error" className="text-xs text-text-muted">
            Timecodes also accept minutes:seconds or seconds, with up to 3 decimal places.
          </p>
        )}
        <div className="flex justify-between text-xs text-text-secondary border-t border-border pt-3">
          <span>Selected duration</span>
          <strong className="font-mono font-medium">
            {timecode(item.trim.end - item.trim.start)}
          </strong>
        </div>
      </fieldset>
    </section>
  );
}
