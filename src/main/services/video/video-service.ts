import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { ChildProcess } from 'node:child_process';
import { fsService } from '../fs-service';
import { logEngine } from '../../../logging';
import { MultiExportRunner } from './multi-export-runner';
import { EncodeRunner } from './encode-runner';
import type { VideoInfo, VideoExportRequest, VideoEvent } from '@shared/video/types';
import { probeVideo, resolveBinary, runTool, spawnFfmpeg } from './ffmpeg-tools';

const log = logEngine.createLogger('VideoService');
class VideoService {
  private exportsInProgress = 0;
  get isExporting() {
    return this.exportsInProgress > 0;
  }
  private videos = new Map<string, VideoInfo>();
  private media = new Map<string, string>();
  private previews = new Map<string, Promise<string>>();
  private runner = new MultiExportRunner(new EncodeRunner((file) => this.allowedFile(file)));
  private previewChildren = new Set<ChildProcess>();
  private sessionDirectory = '';
  private async cacheDirectory(): Promise<string> {
    if (!this.sessionDirectory)
      this.sessionDirectory = path.join(app.getPath('userData'), 'previews', randomUUID());
    await fs.mkdir(this.sessionDirectory, { recursive: true });
    return this.sessionDirectory;
  }
  private async allowedFile(file: string): Promise<string> {
    if (!path.isAbsolute(file)) throw new Error('Choose an absolute file path.');
    const real = await fs.realpath(file);
    if (!fsService.isAllowed(real))
      throw new Error('Choose this file or folder using the file picker first.');
    return real;
  }
  private mediaUrl(file: string): string {
    const token = randomUUID();
    this.media.set(token, file);
    return `verti-media://local/${token}`;
  }
  async resolveMedia(token: string): Promise<string> {
    const file = this.media.get(token);
    if (!file) throw new Error('Unknown media token');
    return this.allowedFile(file);
  }
  async importFile(file: string, displayName?: string): Promise<VideoInfo> {
    const real = await this.allowedFile(file);
    const existing = [...this.videos.values()].find((video) => video.path === real);
    if (existing) return existing;
    const probe = await probeVideo(real);
    const video: VideoInfo = {
      ...probe,
      name: displayName ?? probe.name,
      id: randomUUID(),
      previewUrl: this.mediaUrl(real),
    };
    this.videos.set(video.id, video);
    return video;
  }
  getVideo(id: string): VideoInfo {
    const video = this.videos.get(id);
    if (!video) throw new Error('Import the video first.');
    return video;
  }
  async thumbnail(id: string): Promise<string> {
    const video = this.getVideo(id);
    const input = await this.allowedFile(video.path);
    const output = path.join(await this.cacheDirectory(), `${id}.jpg`);
    await runTool(resolveBinary('ffmpeg'), [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-ss',
      String(Math.min(1, video.duration / 2)),
      '-i',
      input,
      '-frames:v',
      '1',
      '-vf',
      'scale=240:-2',
      '-q:v',
      '5',
      output,
    ]);
    const data = await fs.readFile(output);
    await fs.unlink(output);
    return `data:image/jpeg;base64,${data.toString('base64')}`;
  }
  async preview(id: string): Promise<string> {
    const cached = this.previews.get(id);
    if (cached) return cached;
    const promise = this.convertPreview(id);
    this.previews.set(id, promise);
    try {
      return await promise;
    } catch (error) {
      this.previews.delete(id);
      throw error;
    }
  }
  private async convertPreview(id: string): Promise<string> {
    const video = this.getVideo(id);
    const input = await this.allowedFile(video.path);
    const output = path.join(await this.cacheDirectory(), `${id}.mp4`);
    await new Promise<void>((resolve, reject) => {
      const child = spawnFfmpeg([
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        input,
        '-map',
        '0:v:0',
        '-map',
        '0:a:0?',
        '-vf',
        'scale=640:640:force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1',
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-crf',
        '25',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '96k',
        '-movflags',
        '+faststart',
        output,
      ]);
      this.previewChildren.add(child);
      let detail = '';
      child.stderr?.on('data', (chunk: Buffer) => {
        detail = (detail + chunk.toString()).slice(-1200);
      });
      child.on('error', reject);
      child.on('close', (code) => {
        this.previewChildren.delete(child);
        if (code === 0) resolve();
        else reject(new Error(detail || 'Preview conversion failed.'));
      });
    });
    return this.mediaUrl(output);
  }
  async start(request: VideoExportRequest, notify: (event: VideoEvent) => void): Promise<string> {
    this.exportsInProgress++;
    try {
      return await this.runner.start(request, this.getVideo(request.id), notify);
    } finally {
      this.exportsInProgress--;
    }
  }
  cancel(id: string): void {
    this.runner.cancel(id);
  }
  cleanup(): void {
    this.runner.cleanup();
    for (const child of this.previewChildren) child.kill('SIGKILL');
    if (this.sessionDirectory)
      void fs
        .rm(this.sessionDirectory, { recursive: true, force: true })
        .catch((error: unknown) => log.warn('Preview cleanup failed', { error: String(error) }));
  }
}
export const videoService = new VideoService();
