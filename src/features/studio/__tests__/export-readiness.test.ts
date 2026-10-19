import { describe, expect, it } from 'vitest';
import { exportBlockers } from '../export-readiness';
const ready: Parameters<typeof exportBlockers>[0] = {
  valid: true,
  itemCount: 1,
  queuedCount: 1,
  output: '/exports',
  outputChecking: false,
  outputError: '',
  engine: {
    ready: true,
    version: 'test',
    ffmpegPath: '/ffmpeg',
    encoders: { libx264: true, h264_nvenc: false, h264_qsv: false, h264_vaapi: false },
  },
  encoder: 'libx264',
  loading: false,
  projectWorking: false,
};
describe('Export prerequisites', () => {
  it('enables export only after all prerequisites are satisfied', () => {
    expect(exportBlockers(ready)).toEqual([]);
    const reasons = exportBlockers({
      ...ready,
      valid: false,
      output: '',
      engine: null,
      itemCount: 0,
      queuedCount: 0,
    });
    expect(reasons).toHaveLength(4);
    expect(reasons.join(' ')).toMatch(/Import a video.*In and Out.*default folder.*FFmpeg/);
  });
  it('explains unavailable encoders, folder failures, and work in progress', () => {
    expect(
      exportBlockers({
        ...ready,
        encoder: 'h264_nvenc',
        outputError: 'Choose a writable folder.',
        loading: true,
        projectWorking: true,
      }),
    ).toEqual([
      'Choose a writable folder.',
      'Select an available video encoder.',
      'Wait for video import to finish.',
      'Wait for the project to finish opening.',
    ]);
    expect(exportBlockers({ ...ready, outputChecking: true })).toEqual([
      'Wait for the export folder check to finish.',
    ]);
    expect(exportBlockers({ ...ready, queuedCount: 0 })[0]).toContain('Queue a clip');
    expect(exportBlockers({ ...ready, engine: { ...ready.engine!, ready: false } })[0]).toContain(
      'Install or configure',
    );
  });
});
