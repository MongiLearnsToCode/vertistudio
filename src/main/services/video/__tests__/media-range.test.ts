import { describe, expect, it } from 'vitest';
import { mediaRange } from '../media-range';
import { progressPercent } from '../ffmpeg-tools';
describe('seekable video previews', () => {
  it('serves full, bounded, open and suffix byte ranges', () => {
    expect(mediaRange(null, 100)).toEqual({ start: 0, end: 99 });
    expect(mediaRange('bytes=20-40', 100)).toEqual({ start: 20, end: 40 });
    expect(mediaRange('bytes=50-', 100)).toEqual({ start: 50, end: 99 });
    expect(mediaRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 });
    expect(mediaRange('bytes=0-1000', 100)).toEqual({ start: 0, end: 99 });
  });
  it('rejects unsatisfiable and multiple ranges', () => {
    for (const header of ['bytes=100-', 'bytes=30-20', 'bytes=-0', 'bytes=0-1,3-5', 'invalid'])
      expect(mediaRange(header, 100)).toBeNull();
  });
  it('measures progress against the cut duration without resetting on other keys', () => {
    expect(progressPercent('out_time_us=360000', 0.72)).toBe(50);
    expect(progressPercent('out_time_us=900000', 0.72)).toBe(100);
    expect(progressPercent('speed=3x', 0.72)).toBeUndefined();
  });
});
