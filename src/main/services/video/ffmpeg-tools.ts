import { execFile, spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { resolveBinary } from './binary-location';
export { resolveBinary } from './binary-location';
import { z } from 'zod';
import type { EncoderId } from '@shared/video/types';

export function runTool(bin: string, args: string[], timeout = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      bin,
      args,
      { timeout, maxBuffer: 16 * 1024 * 1024, windowsHide: true, shell: false },
      (error, stdout, stderr) => {
        if (error) reject(new Error(stderr.slice(-1200) || error.message));
        else resolve(stdout);
      },
    );
  });
}

const streamSchema = z.object({
  codec_type: z.string().optional(),
  codec_name: z.string().optional(),
  pix_fmt: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  avg_frame_rate: z.string().optional(),
  duration: z.string().optional(),
  tags: z.object({ rotate: z.string().optional() }).optional(),
  side_data_list: z.array(z.object({ rotation: z.number().optional() })).optional(),
});
const probeSchema = z.object({
  streams: z.array(streamSchema),
  format: z.object({ duration: z.string().optional(), size: z.string().optional() }),
});
export async function probeVideo(file: string) {
  const raw = await runTool(resolveBinary('ffprobe'), [
    '-v',
    'error',
    '-show_streams',
    '-show_format',
    '-of',
    'json',
    file,
  ]);
  const data = probeSchema.parse(JSON.parse(raw));
  const video = data.streams.find((stream) => stream.codec_type === 'video');
  if (!video?.width || !video.height) throw new Error('This file has no readable video stream.');
  const duration = Number(data.format.duration ?? video.duration);
  if (!Number.isFinite(duration) || duration <= 0)
    throw new Error('Could not determine the video duration.');
  const rotation =
    video.side_data_list?.find((entry) => entry.rotation !== undefined)?.rotation ??
    Number(video.tags?.rotate ?? 0);
  const rotated = Math.abs(rotation) % 180 === 90;
  const [num = '0', den = '1'] = (video.avg_frame_rate ?? '0/1').split('/');
  return {
    path: file,
    name: path.basename(file),
    width: rotated ? video.height : video.width,
    height: rotated ? video.width : video.height,
    duration,
    fps: Number(den) ? Number(num) / Number(den) : 0,
    size: Number(data.format.size ?? 0),
    hasAudio: data.streams.some((stream) => stream.codec_type === 'audio'),
    videoCodec: video.codec_name ?? 'unknown',
    bitDepth: /10|12|16/.test(video.pix_fmt ?? '') ? '10+ bit' : '8-bit',
  };
}
export async function engineStatus() {
  const encoders: Record<EncoderId, boolean> = {
    libx264: false,
    h264_nvenc: false,
    h264_qsv: false,
    h264_vaapi: false,
  };
  const bin = resolveBinary('ffmpeg');
  resolveBinary('ffprobe');
  const [version, listing] = await Promise.all([
    runTool(bin, ['-version']),
    runTool(bin, ['-hide_banner', '-encoders']),
  ]);
  const available = new Set(
    [...listing.matchAll(/^\s*[A-Z.]{6}\s+(\S+)/gm)].map((match) => match[1]),
  );
  for (const key of Object.keys(encoders) as EncoderId[]) encoders[key] = available.has(key);
  return {
    ready: encoders.libx264 && available.has('aac'),
    version: version.split('\n')[0] ?? '',
    ffmpegPath: bin,
    encoders,
    error:
      encoders.libx264 && available.has('aac')
        ? undefined
        : 'FFmpeg needs the libx264 and AAC encoders.',
  };
}
export function spawnFfmpeg(args: string[]): ChildProcess {
  return spawn(resolveBinary('ffmpeg'), args, {
    windowsHide: true,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
export function progressPercent(line: string, duration: number): number | undefined {
  const match = /^out_time_us=(\d+)$/.exec(line.trim());
  return match ? Math.min(100, Math.max(0, (Number(match[1]) / 1e6 / duration) * 100)) : undefined;
}
