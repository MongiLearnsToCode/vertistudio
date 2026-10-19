// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CutEditor } from '../components/CutEditor';
import type { Trim, VideoInfo } from '@shared/video/types';
import { timecode } from '@shared/video/timecode';

const video: VideoInfo = {
  id: '9c28301c-283e-4d12-82c7-7e126734ae15',
  path: '/source.mp4',
  name: 'source.mp4',
  width: 1920,
  height: 1080,
  fps: 25,
  duration: 10.123456,
  size: 1000,
  videoCodec: 'h264',
  bitDepth: '8',
  hasAudio: true,
  previewUrl: 'verti-media://local/test',
};
const onTrim = vi.fn();
const onValidity = vi.fn();
function Cutter({
  initial = { start: 2, end: 7 },
  locked = false,
}: {
  initial?: Trim;
  locked?: boolean;
}) {
  const [trim, setTrim] = useState(initial);
  return (
    <CutEditor
      item={{ id: video.id, video, trim, status: 'queued', percent: 0 }}
      locked={locked}
      onTrim={(id, value) => {
        onTrim(id, value);
        setTrim(value);
      }}
      onValidity={onValidity}
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

describe('Clearing cut boundaries', () => {
  it('clears each boundary independently, keeps the playhead, and preserves the exact source end', () => {
    const view = render(<Cutter />);
    const player = view.container.querySelector('video')!;
    fireEvent.loadedMetadata(player);
    player.currentTime = 5;
    fireEvent.timeUpdate(player);
    fireEvent.click(view.getByRole('button', { name: /^Clear in$/ }));
    expect(onTrim).toHaveBeenLastCalledWith(video.id, { start: 0, end: 7 });
    expect(player.currentTime).toBe(5);
    expect(view.container.querySelector<HTMLInputElement>('#cut-start')!.value).toBe(timecode(0));
    fireEvent.click(view.getByRole('button', { name: 'Clear out' }));
    expect(onTrim).toHaveBeenLastCalledWith(video.id, { start: 0, end: video.duration });
    expect(player.currentTime).toBe(5);
    expect(view.container.querySelector<HTMLInputElement>('#cut-end')!.value).toBe(
      timecode(video.duration),
    );
  });
  it('clears both points with one action and leaves the playhead in place', () => {
    const view = render(<Cutter />);
    const player = view.container.querySelector('video')!;
    fireEvent.loadedMetadata(player);
    player.currentTime = 5;
    fireEvent.click(view.getByRole('button', { name: 'Clear in/out' }));
    expect(onTrim).toHaveBeenLastCalledWith(video.id, { start: 0, end: video.duration });
    expect(player.currentTime).toBe(5);
    expect(onValidity).toHaveBeenLastCalledWith(true);
  });
  it('can recover invalid timecodes without a loaded preview', () => {
    const view = render(<Cutter />);
    fireEvent.change(view.container.querySelector('#cut-start')!, { target: { value: 'bad' } });
    expect(view.getByRole('alert')).toBeTruthy();
    fireEvent.click(view.getByRole('button', { name: /^Clear in$/ }));
    expect(view.queryByRole('alert')).toBeNull();
    expect(onTrim).toHaveBeenLastCalledWith(video.id, { start: 0, end: 7 });
    expect(onValidity).toHaveBeenLastCalledWith(true);
  });
  it('disables already-cleared boundaries and prevents clearing during export', () => {
    const view = render(<Cutter initial={{ start: 0, end: video.duration }} />);
    for (const name of [/^Clear in$/, /^Clear out$/, /^Clear in\/out$/])
      expect(view.getByRole('button', { name }).hasAttribute('disabled')).toBe(true);
    view.rerender(<Cutter key="locked" initial={{ start: 2, end: 7 }} locked />);
    for (const name of [/^Clear in$/, /^Clear out$/, /^Clear in\/out$/]) {
      const button = view.getByRole('button', { name });
      expect(button.hasAttribute('disabled')).toBe(true);
      fireEvent.click(button);
    }
    expect(onTrim).not.toHaveBeenCalled();
  });
});
