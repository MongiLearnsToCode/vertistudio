import { describe, expect, it, vi } from 'vitest';
import { MultiExportRunner } from '../multi-export-runner';
import type { VideoEvent, VideoExportRequest, VideoInfo } from '@shared/video/types';

const video: VideoInfo = {
  id: '9c28301c-283e-4d12-82c7-7e126734ae15',
  path: '/source.mp4',
  name: 'source.mp4',
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 20,
  size: 1000,
  videoCodec: 'h264',
  bitDepth: '8',
  hasAudio: true,
  previewUrl: '',
};
const request: VideoExportRequest = {
  id: video.id,
  both: true,
  fit: 'crop',
  preset: 'quality',
  encoder: 'libx264',
  keepFps: true,
  trim: { start: 2, end: 6 },
  outputDirectory: '/exports',
};
function fakeRunner() {
  return {
    start: vi.fn(
      async (
        options: VideoExportRequest,
        _video: VideoInfo,
        notify: (event: VideoEvent) => void,
      ) => {
        const output = options.fit === 'keep' ? '/exports/Original.mp4' : '/exports/Vertical.mp4';
        queueMicrotask(() => {
          notify({ id: video.id, type: 'progress', percent: 50 });
          notify({ id: video.id, type: 'progress', speed: '2x' });
          notify({ id: video.id, type: 'done', output, size: 100 });
        });
        return output;
      },
    ),
    cancel: vi.fn(),
    cleanup: vi.fn(),
  };
}

describe('Original and vertical exports in one batch', () => {
  it('exports matching cuts with separate fits and completes only after both files', async () => {
    const runner = fakeRunner();
    const events: VideoEvent[] = [];
    await new MultiExportRunner(runner).start(request, video, (event) => events.push(event));
    expect(runner.start.mock.calls.map(([options]) => options.fit)).toEqual(['keep', 'crop']);
    for (const [options] of runner.start.mock.calls) {
      expect(options.trim).toEqual({ start: 2, end: 6 });
      expect(options.preset).toBe('quality');
      expect(options.both).toBe(false);
    }
    expect(events.filter((event) => event.type === 'done')).toHaveLength(1);
    expect(events.at(-1)).toMatchObject({
      type: 'done',
      percent: 100,
      size: 200,
      outputs: [
        { format: 'original', path: '/exports/Original.mp4', size: 100 },
        { format: 'vertical', path: '/exports/Vertical.mp4', size: 100 },
      ],
    });
    expect(
      events.filter((event) => event.percent !== undefined).map((event) => event.percent),
    ).toEqual([25, 50, 75, 100]);
  });
  it('uses automatic vertical framing when the saved fit was original', async () => {
    const runner = fakeRunner();
    await new MultiExportRunner(runner).start({ ...request, fit: 'keep' }, video, () => {});
    expect(runner.start.mock.calls.map(([options]) => options.fit)).toEqual(['keep', 'auto']);
  });
  it('keeps the completed original available when vertical encoding fails', async () => {
    const runner = fakeRunner();
    runner.start
      .mockImplementationOnce(async (_options, _video, notify) => {
        queueMicrotask(() =>
          notify({ id: video.id, type: 'done', output: '/exports/Original.mp4', size: 100 }),
        );
        return '/exports/Original.mp4';
      })
      .mockImplementationOnce(async (_options, _video, notify) => {
        queueMicrotask(() => notify({ id: video.id, type: 'error', error: 'Encoder failed' }));
        return '/exports/Vertical.mp4';
      });
    const events: VideoEvent[] = [];
    await new MultiExportRunner(runner).start(request, video, (event) => events.push(event));
    expect(events.at(-1)).toMatchObject({
      type: 'error',
      error: 'Encoder failed',
      outputs: [{ format: 'original', path: '/exports/Original.mp4', size: 100 }],
    });
    expect(events.some((event) => event.type === 'done')).toBe(false);
  });
  it('stops between versions when canceled and retains the completed file', async () => {
    const runner = fakeRunner();
    const batch = new MultiExportRunner(runner);
    const events: VideoEvent[] = [];
    await batch.start(request, video, (event) => {
      events.push(event);
      if (event.type === 'progress' && event.outputs?.length === 1) batch.cancel(video.id);
    });
    expect(runner.start).toHaveBeenCalledTimes(1);
    expect(runner.cancel).toHaveBeenCalledWith(video.id);
    expect(events.at(-1)).toMatchObject({ type: 'canceled', outputs: [{ format: 'original' }] });
  });
  it('cancels the active second version and rejects duplicate jobs', async () => {
    const runner = fakeRunner();
    let pending: ((event: VideoEvent) => void) | undefined;
    runner.start
      .mockImplementationOnce(async (_options, _video, notify) => {
        queueMicrotask(() =>
          notify({ id: video.id, type: 'done', output: '/exports/Original.mp4', size: 100 }),
        );
        return '/exports/Original.mp4';
      })
      .mockImplementationOnce(async (_options, _video, notify) => {
        pending = notify;
        return '/exports/Vertical.mp4';
      });
    runner.cancel.mockImplementation(() => pending?.({ id: video.id, type: 'canceled' }));
    const batch = new MultiExportRunner(runner);
    const events: VideoEvent[] = [];
    const completion = batch.start(request, video, (event) => events.push(event));
    await vi.waitFor(() => expect(pending).toBeDefined());
    await expect(batch.start(request, video, () => {})).rejects.toThrow('already encoding');
    batch.cancel(video.id);
    await completion;
    expect(events.at(-1)).toMatchObject({ type: 'canceled', outputs: [{ format: 'original' }] });
  });
  it('releases the job after a launch failure and preserves single-output behavior', async () => {
    const runner = fakeRunner();
    const batch = new MultiExportRunner(runner);
    runner.start.mockRejectedValueOnce(new Error('Cannot start encoder'));
    await expect(batch.start(request, video, () => {})).rejects.toThrow('Cannot start encoder');
    await expect(batch.start(request, video, () => {})).resolves.toBe('/exports/Vertical.mp4');
    const single = { ...request, both: false, fit: 'keep' as const };
    const notify = vi.fn();
    await batch.start(single, video, notify);
    expect(runner.start).toHaveBeenLastCalledWith(single, video, notify);
  });
});
