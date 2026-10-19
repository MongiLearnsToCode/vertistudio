import type { VideoInfo } from '@shared/video/types';
import type { useVideoCut } from '../hooks/useVideoCut';

interface Props {
  video: VideoInfo;
  cut: ReturnType<typeof useVideoCut>;
}

export function SourcePreview({ video, cut }: Props) {
  return (
    <section
      aria-label="Source preview"
      className="rounded-lg border border-border bg-app-surface p-4 min-w-0"
    >
      <h2 className="text-sm font-medium text-text-primary mb-3">Source preview</h2>
      <video
        aria-label={`Preview ${video.name}`}
        ref={cut.videoRef}
        src={cut.source}
        width={video.width}
        height={video.height}
        style={{ aspectRatio: `${video.width} / ${video.height}` }}
        controls
        preload="metadata"
        playsInline
        className="block w-full h-auto rounded-md bg-app-deep object-contain"
        onLoadedMetadata={cut.loaded}
        onError={() => void cut.fallback()}
        onTimeUpdate={cut.syncPosition}
        onSeeked={cut.syncPosition}
        onPlay={() => cut.setPlaying(true)}
        onPause={() => cut.setPlaying(false)}
      />
      <p role="status" className="mt-2 text-xs text-text-muted">
        {cut.note}
      </p>
    </section>
  );
}
