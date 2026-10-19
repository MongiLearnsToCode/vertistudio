import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { ChildProcess } from 'node:child_process';
import { fsService } from '../fs-service';
import { logEngine } from '../../../logging';
import { PRESETS, buildArgs, effectiveFit, trimRange } from '@shared/video/presets';
import type { VideoInfo, VideoExportRequest, VideoEvent } from '@shared/video/types';
import { spawnFfmpeg, progressPercent } from './ffmpeg-tools';
const log = logEngine.createLogger('EncodeRunner');
async function fileExists(file: string): Promise<boolean> {
  try {
    await fs.lstat(file);
    return true;
  } catch {
    return false;
  }
}
interface Job {
  child: ChildProcess;
  canceled: boolean;
  output: string;
}
export class EncodeRunner {
  private jobs = new Map<string, Job>();
  private starting = new Set<string>();
  private cancelRequested = new Set<string>();
  constructor(private allowedFile: (file: string) => Promise<string>) {}
  async start(
    request: VideoExportRequest,
    video: VideoInfo,
    notify: (event: VideoEvent) => void,
  ): Promise<string> {
    if (this.jobs.has(request.id) || this.starting.has(request.id))
      throw new Error('This video is already encoding.');
    this.starting.add(request.id);
    try {
      return await this.launch(request, video, notify);
    } finally {
      this.starting.delete(request.id);
      this.cancelRequested.delete(request.id);
    }
  }
  private async launch(
    request: VideoExportRequest,
    video: VideoInfo,
    notify: (event: VideoEvent) => void,
  ): Promise<string> {
    const range = trimRange(video, request.trim);
    const input = await this.allowedFile(video.path);
    const directory = await this.allowedFile(request.outputDirectory);
    if (!(await fs.stat(directory)).isDirectory()) throw new Error('Choose an output folder.');
    const base = `${path.parse(video.name).name}${range.start > 0 || range.end < video.duration ? ' Cut' : ''} Verti ${request.fit === 'keep' ? 'Original' : 'Vertical'}`;
    let output = path.join(directory, `${base}.mp4`);
    let suffix = 1;
    while (await fileExists(output)) output = path.join(directory, `${base} (${suffix++}).mp4`);
    // Canonicalize an existing output too: a symlink must not escape the chosen folder.
    if (!fsService.isAllowed(output)) throw new Error('Output is outside the chosen folder.');
    const preset = PRESETS.find((entry) => entry.id === request.preset);
    if (!preset) throw new Error('Unknown export quality.');
    const args = buildArgs({
      input,
      output,
      probe: video,
      preset,
      encoder: request.encoder,
      fit: effectiveFit(request.fit, video),
      keepFps: request.keepFps,
      trim: request.trim,
    });
    const child = spawnFfmpeg(args);
    const job: Job = { child, canceled: false, output };
    this.jobs.set(request.id, job);
    let buffer = '';
    let detail = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const percent = progressPercent(line, range.duration);
        if (percent !== undefined) notify({ id: request.id, type: 'progress', percent });
        else if (line.startsWith('speed='))
          notify({ id: request.id, type: 'progress', speed: line.slice(6).trim() });
      }
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      detail = (detail + chunk.toString()).slice(-2400);
    });
    let spawnError = '';
    child.on('error', (error) => {
      spawnError = error.message;
    });
    child.on('close', (code) => {
      void (async () => {
        this.jobs.delete(request.id);
        if (job.canceled || code !== 0) {
          await fs
            .unlink(output)
            .catch((error: unknown) =>
              log.debug('No partial output to remove', { error: String(error) }),
            );
          notify({
            id: request.id,
            type: job.canceled ? 'canceled' : 'error',
            error:
              spawnError ||
              detail.split('\n').filter(Boolean).slice(-3).join('\n') ||
              'FFmpeg encoding failed.',
          });
        } else {
          const stat = await fs.stat(output);
          notify({ id: request.id, type: 'done', output, size: stat.size });
        }
      })().catch((error: unknown) => {
        log.error('Finishing encode failed', error);
        notify({ id: request.id, type: 'error', error: String(error) });
      });
    });
    if (this.cancelRequested.has(request.id)) this.cancel(request.id);
    return output;
  }
  cancel(id: string): void {
    const job = this.jobs.get(id);
    if (!job) {
      if (this.starting.has(id)) this.cancelRequested.add(id);
      return;
    }
    job.canceled = true;
    job.child.kill('SIGINT');
    const timer = setTimeout(() => {
      if (this.jobs.get(id) === job) job.child.kill('SIGKILL');
    }, 3000);
    timer.unref();
  }
  cleanup(): void {
    for (const job of this.jobs.values()) {
      job.canceled = true;
      job.child.kill('SIGKILL');
    }
  }
}
