import { useExportReadiness } from '../hooks/useExportReadiness';
import { FolderOpen, Download } from 'lucide-react';
import { Button, Select, Tooltip } from '@shared/components';
import { Icon } from '@renderer/components/Icon';
import { PRESETS, FIT_MODES, encoderLabel, effectiveFit } from '@shared/video/presets';
import { estimateBytes, formatBytes } from '@shared/video/timecode';
import type { EncoderId, FitId } from '@shared/video/types';
import type { StudioController } from '../hooks/useStudio';
export function ExportSettings({ studio, valid }: { studio: StudioController; valid: boolean }) {
  const readiness = useExportReadiness(studio, valid);
  const queued = studio.items.filter((item) => item.status === 'queued');
  const estimate = queued.reduce(
    (sum, item) => sum + estimateBytes(item.trim.end - item.trim.start, studio.preset),
    0,
  );
  const fileCount = queued.length * (studio.both ? 2 : 1);
  const framing = studio.selected ? effectiveFit(studio.fit, studio.selected.video) : studio.fit;
  return (
    <aside
      aria-label="Export settings"
      className="w-full min-w-0 rounded-lg border border-border bg-app-surface p-4 space-y-5 self-start"
    >
      <div>
        <h2 className="text-sm font-medium text-text-primary">Export settings</h2>
        <p className="text-xs text-text-muted mt-1">Applied to all queued clips</p>
      </div>
      <fieldset disabled={studio.running || studio.projects.working} className="space-y-2">
        <legend className="text-xs text-text-secondary mb-2">Quality</legend>
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            aria-pressed={studio.preset === preset.id}
            onClick={() => studio.setPreset(preset.id)}
            className={`w-full text-left rounded-md p-2.5 border cursor-pointer ${studio.preset === preset.id ? 'border-accent bg-app-active' : 'border-border hover:bg-app-hover'}`}
          >
            <span className="flex justify-between text-xs text-text-primary">
              <strong className="font-medium">{preset.name}</strong>
              <span className="text-text-muted">CRF {preset.crf}</span>
            </span>
            <span className="block text-[11px] text-text-muted mt-1">{preset.tagline}</span>
          </button>
        ))}
      </fieldset>
      <fieldset disabled={studio.running || studio.projects.working} className="space-y-3">
        <legend className="text-xs text-text-secondary mb-2">Output aspect ratio</legend>
        <label className="flex items-start gap-2 text-xs text-text-primary cursor-pointer">
          <input
            type="radio"
            name="export-aspect-ratio"
            value="original"
            checked={!studio.both && studio.fit === 'keep'}
            onChange={() => studio.setAspectRatio('original')}
            className="mt-0.5 accent-accent"
            aria-describedby="original-aspect-description"
          />
          <span>
            Original aspect ratio
            <span
              id="original-aspect-description"
              className="block text-[11px] text-text-muted mt-1"
            >
              Keep source dimensions. No cropping, padding, or vertical conversion.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-xs text-text-primary cursor-pointer">
          <input
            type="radio"
            name="export-aspect-ratio"
            value="vertical"
            checked={!studio.both && studio.fit !== 'keep'}
            onChange={() => studio.setAspectRatio('vertical')}
            className="mt-0.5 accent-accent"
          />
          <span>Vertical (9:16)</span>
        </label>
        <label className="flex items-start gap-2 text-xs text-text-primary cursor-pointer">
          <input
            type="radio"
            name="export-aspect-ratio"
            value="both"
            checked={studio.both}
            onChange={() => studio.setAspectRatio('both')}
            className="mt-0.5 accent-accent"
          />
          <span>
            Both (original + vertical)
            <span className="block text-[11px] text-text-muted mt-1">
              Two files per cut, with matching in and out points.
            </span>
          </span>
        </label>
        {studio.fit !== 'keep' || studio.both ? (
          <Select
            aria-label="Export framing"
            value={studio.fit === 'keep' ? 'auto' : studio.fit}
            disabled={studio.running || studio.projects.working}
            className="w-full"
            onValueChange={(value) => studio.setFit(value as FitId)}
            options={[
              { value: 'auto', label: 'Automatic' },
              ...FIT_MODES.filter((fit) => fit.id !== 'keep').map((fit) => ({
                value: fit.id,
                label: fit.name,
              })),
            ]}
          />
        ) : null}
        <p role="status" className="text-[11px] text-text-muted">
          {studio.both
            ? 'Original dimensions + 1080 × 1920 vertical · H.264 MP4'
            : studio.fit === 'keep'
              ? studio.selected
                ? `${studio.selected.video.width} × ${studio.selected.video.height} · Original aspect ratio · H.264 MP4`
                : 'Each clip keeps its original aspect ratio and dimensions · H.264 MP4'
              : '1080 × 1920 · Vertical H.264 MP4'}
          {studio.fit === 'auto' && studio.selected
            ? ` · ${FIT_MODES.find((fit) => fit.id === framing)?.name}`
            : ''}
        </p>
      </fieldset>
      <div className="space-y-2">
        <span className="text-xs text-text-secondary">Encoder</span>
        <Select
          aria-label="Video encoder"
          value={studio.encoder}
          disabled={studio.running || studio.projects.working || !studio.engine}
          className="w-full"
          onValueChange={(value) => studio.setEncoder(value as EncoderId)}
          options={(['libx264', 'h264_nvenc', 'h264_qsv', 'h264_vaapi'] as const).map((id) => ({
            value: id,
            label: encoderLabel(id),
            disabled: !studio.engine?.encoders[id],
          }))}
        />
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={studio.keepFps}
            disabled={studio.running || studio.projects.working}
            onChange={(event) => studio.setKeepFps(event.target.checked)}
            className="accent-accent"
          />
          Keep original frame rate
        </label>
      </div>
      <div className="space-y-2">
        <span className="text-xs text-text-secondary">Destination</span>
        <Button
          variant="secondary"
          disabled={studio.running || studio.projects.working}
          onClick={() => void studio.chooseOutput()}
          className="w-full !justify-start gap-2"
        >
          <Icon icon={FolderOpen} size={14} />
          <span className="truncate" title={studio.output}>
            {studio.output || 'Choose export folder…'}
          </span>
        </Button>
        <p className="text-[11px] text-text-muted">
          {studio.usingDefaultOutput ? 'Using your default export folder. ' : ''}Existing files are
          kept. New exports receive a unique name.
        </p>
      </div>
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex justify-between text-xs text-text-secondary">
          <span>{queued.length} ready</span>
          <span>~{formatBytes(estimate * (studio.both ? 2 : 1))}</span>
        </div>
        {studio.running ? (
          <Button variant="secondary" className="w-full" onClick={studio.cancelAll}>
            Cancel batch
          </Button>
        ) : (
          <Tooltip
            content={
              readiness.disabled ? (
                <ul className="max-w-xs space-y-1">
                  {readiness.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              ) : (
                'Export the queued clips'
              )
            }
          >
            <span
              className="block"
              role={readiness.disabled ? 'group' : undefined}
              tabIndex={readiness.disabled ? 0 : undefined}
              aria-label={readiness.disabled ? 'Export unavailable' : undefined}
              aria-describedby={readiness.disabled ? 'export-requirements' : undefined}
            >
              <Button
                variant="primary"
                size="md"
                className="w-full gap-2 disabled:pointer-events-none"
                aria-describedby={readiness.disabled ? 'export-requirements' : undefined}
                disabled={readiness.disabled}
                onClick={() => void studio.exportAll()}
              >
                <Icon icon={Download} size={14} />
                Export{' '}
                {studio.both
                  ? `${fileCount} files`
                  : queued.length === 1
                    ? 'clip'
                    : `${queued.length} clips`}
              </Button>
            </span>
          </Tooltip>
        )}
        {readiness.disabled ? (
          <p id="export-requirements" className="sr-only">
            {readiness.reasons.join(' ')}
          </p>
        ) : null}
        <p className="text-[11px] text-text-muted">
          {studio.engine?.ready
            ? 'FFmpeg ready · Files stay on this computer'
            : studio.engine?.error || studio.error || 'Checking FFmpeg and FFprobe…'}
        </p>
      </div>
    </aside>
  );
}
