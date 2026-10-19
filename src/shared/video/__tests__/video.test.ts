import { describe, expect, it } from 'vitest';
import { buildArgs, PRESETS, FIT_MODES, effectiveFit, trimRange } from '../presets';
import { parseTimecode, timecode } from '../timecode';
import { videoExportSchema } from '@shared/validation/video-schema';
import type { VideoInfo } from '../types';
const video: VideoInfo = {
  id: '9c28301c-283e-4d12-82c7-7e126734ae15',
  path: '/source.mp4',
  name: 'source.mp4',
  width: 1920,
  height: 1080,
  fps: 60,
  duration: 65.123456,
  size: 1000,
  videoCodec: 'h264',
  bitDepth: '8-bit',
  hasAudio: true,
  previewUrl: '',
};
const option = (args: string[], key: string) => args[args.indexOf(key) + 1];
describe('video cutting', () => {
  it('parses flexible timecodes and rejects malformed boundaries', () => {
    expect(parseTimecode('01:02:03.456')).toBe(3723.456);
    expect(parseTimecode('62.5')).toBe(62.5);
    expect(parseTimecode('02:03')).toBe(123);
    for (const input of ['1:60', '-2', 'abc', '0:0:0:1', 'Infinity'])
      expect(Number.isNaN(parseTimecode(input))).toBe(true);
    expect(timecode(3723.456)).toBe('01:02:03.456');
  });
  it('validates finite in/out points and preserves source duration precision', () => {
    for (const trim of [
      { start: -1, end: 2 },
      { start: 1, end: 1 },
      { start: 3, end: 2 },
      { start: 0, end: 66 },
      { start: NaN, end: 2 },
    ])
      expect(() => trimRange(video, trim)).toThrow();
    expect(trimRange(video, { start: 0, end: video.duration }).duration).toBe(video.duration);
  });
  it('exports the selected range through every existing preset and fit', () => {
    for (const preset of PRESETS)
      for (const { id: fit } of FIT_MODES) {
        const args = buildArgs({
          input: video.path,
          output: '/cut.mp4',
          probe: video,
          preset,
          encoder: 'libx264',
          fit,
          trim: { start: 0.52, end: 1.24 },
        });
        expect(option(args, '-ss')).toBe('0.52');
        expect(option(args, '-t')).toBe('0.72');
        expect(args.indexOf('-ss')).toBeLessThan(args.indexOf('-i'));
        expect(args).toContain('-n');
        expect(option(args, '-crf')).toBe(String(preset.crf));
        if (fit === 'blur') {
          expect(option(args, '-map')).toBe('[vout]');
          expect(option(args, '-filter_complex')).toContain(';[bg]');
        }
        if (fit === 'keep') expect(args).not.toContain('-vf');
      }
  });
  it.each([
    { width: 1920, height: 1080 },
    { width: 1080, height: 1920 },
    { width: 1080, height: 1080 },
  ])(
    'preserves source geometry for original-aspect exports of $width × $height footage',
    (dimensions) => {
      const probe = { ...video, ...dimensions };
      const args = buildArgs({
        input: video.path,
        output: '/original.mp4',
        probe,
        preset: PRESETS[0]!,
        encoder: 'libx264',
        fit: effectiveFit('keep', probe),
        trim: { start: 1, end: 3 },
      });
      expect(args).not.toContain('-vf');
      expect(args).not.toContain('-filter_complex');
      expect(args).not.toContain('-aspect');
      expect(args).not.toContain('-s');
      expect(option(args, '-t')).toBe('2');
    },
  );
  it('handles silent footage, FPS conversion, and hardware blur mapping', () => {
    const args = buildArgs({
      input: video.path,
      output: '/cut.mp4',
      probe: { ...video, hasAudio: false },
      preset: PRESETS[0]!,
      encoder: 'h264_vaapi',
      fit: 'blur',
      keepFps: false,
      trim: { start: 0, end: 1 },
    });
    expect(args).toContain('-an');
    expect(option(args, '-filter_complex')).toContain('fps=30,format=nv12,hwupload[vout]');
    expect(args.indexOf('-vaapi_device')).toBeLessThan(args.indexOf('-i'));
    expect(effectiveFit('auto', video)).toBe('blur');
    expect(effectiveFit('auto', { width: 1080, height: 1920 })).toBe('keep');
  });
  it('rejects arbitrary encoder names and invalid trim requests at IPC', () => {
    const request = {
      id: video.id,
      preset: 'quality',
      fit: 'auto',
      encoder: 'libx264',
      keepFps: true,
      outputDirectory: '/exports',
      trim: { start: 0, end: 1 },
    };
    expect(videoExportSchema.safeParse(request).success).toBe(true);
    expect(videoExportSchema.safeParse({ ...request, encoder: '-run-script' }).success).toBe(false);
    expect(videoExportSchema.safeParse({ ...request, trim: { start: 3, end: 2 } }).success).toBe(
      false,
    );
  });
});
