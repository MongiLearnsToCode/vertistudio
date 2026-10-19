// @vitest-environment jsdom
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VideoInfo } from '@shared/video/types';
import { CutEditor } from '../components/CutEditor';

const video: VideoInfo = {
  id: 'source',
  path: '/source.mp4',
  name: 'source.mp4',
  width: 1920,
  height: 1080,
  fps: 25,
  duration: 10,
  size: 1000,
  videoCodec: 'h264',
  bitDepth: '8',
  hasAudio: true,
  previewUrl: 'verti-media://local/source',
};
const onTrim = vi.fn();
const onValidity = vi.fn();
function Editor({ width, height }: { width: number; height: number }) {
  return (
    <CutEditor
      item={{
        id: video.id,
        video: { ...video, width, height },
        trim: { start: 1, end: 8 },
        status: 'queued',
        percent: 0,
      }}
      locked={false}
      onTrim={onTrim}
      onValidity={onValidity}
      queue={<section aria-label="Video queue">Queued shorts</section>}
      exportSettings={<aside aria-label="Export settings">Export options</aside>}
    />
  );
}

beforeEach(() => {
  onTrim.mockClear();
  onValidity.mockClear();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Adaptive source preview', () => {
  it.each([
    [1920, 1080],
    [1080, 1920],
    [1080, 1080],
    [2560, 1080],
  ])('reserves the source aspect ratio before playback for %i × %i', (width, height) => {
    const view = render(<Editor width={width} height={height} />);
    const preview = within(view.getByRole('region', { name: 'Source preview' }));
    const player = preview.getByLabelText('Preview source.mp4') as HTMLVideoElement;
    expect(player.width).toBe(width);
    expect(player.height).toBe(height);
    expect(player.style.aspectRatio).toBe(`${width} / ${height}`);
    expect(player.className).toContain('w-full h-auto');
    expect(player.className).not.toMatch(/min-h-|h-\[/);
  });

  it('groups portrait details, trim controls and queue beside the source and export panels', () => {
    const view = render(<Editor width={1080} height={1920} />);
    const details = within(view.getByRole('region', { name: 'Cut details and queue' }));
    expect(details.getByRole('region', { name: 'Video cutter' })).toBeTruthy();
    expect(details.getByRole('region', { name: 'Video queue' })).toBeTruthy();
    expect(details.queryByRole('region', { name: 'Source preview' })).toBeNull();
    expect(details.queryByRole('complementary', { name: 'Export settings' })).toBeNull();
    const player = view.getByLabelText('Preview source.mp4') as HTMLVideoElement;
    fireEvent.loadedMetadata(player);
    player.currentTime = 3;
    fireEvent.click(details.getByRole('button', { name: 'Set in at playhead' }));
    expect(onTrim).toHaveBeenLastCalledWith(video.id, { start: 3, end: 8 });
    fireEvent.click(details.getByRole('button', { name: 'Clear out' }));
    expect(onTrim).toHaveBeenLastCalledWith(video.id, { start: 1, end: 10 });
  });
});
