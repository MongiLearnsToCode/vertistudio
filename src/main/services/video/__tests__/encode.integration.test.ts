import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { probeVideo, resolveBinary, runTool } from '../ffmpeg-tools';
import { buildArgs, PRESETS } from '@shared/video/presets';
import type { FitId } from '@shared/video/types';

describe('FFmpeg export integration', () => {
  it.runIf(process.env.VERTI_TEST_FFMPEG === '1')(
    'cuts between keyframes with audio through every framing mode',
    async () => {
      const directory = await mkdtemp(path.join(os.tmpdir(), 'verti-encode-test-'));
      const binary = resolveBinary('ffmpeg');
      try {
        const input = path.join(directory, 'wide.mp4');
        await runTool(binary, [
          '-hide_banner',
          '-loglevel',
          'error',
          '-f',
          'lavfi',
          '-i',
          'testsrc2=size=320x180:rate=25:duration=2',
          '-f',
          'lavfi',
          '-i',
          'sine=frequency=440:duration=2',
          '-c:v',
          'libx264',
          '-g',
          '50',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          input,
        ]);
        const probe = { ...(await probeVideo(input)), id: 'fixture', previewUrl: '' };
        for (const fit of ['keep', 'crop', 'pad', 'blur'] as FitId[]) {
          const output = path.join(directory, `${fit}.mp4`);
          const args = buildArgs({
            input,
            output,
            probe,
            preset: PRESETS[0]!,
            encoder: 'libx264',
            fit,
            trim: { start: 0.52, end: 1.24 },
          });
          await runTool(binary, args, 60000);
          const result = await probeVideo(output);
          expect(Math.abs(result.duration - 0.72)).toBeLessThan(0.08);
          expect(result.hasAudio).toBe(true);
          expect(result.width).toBe(fit === 'keep' ? 320 : 1080);
          expect(result.height).toBe(fit === 'keep' ? 180 : 1920);
        }
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
    180000,
  );
});
