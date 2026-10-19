export type PresetId = 'balanced' | 'quality' | 'master';
export type FitId = 'auto' | 'keep' | 'crop' | 'pad' | 'blur';
export type EncoderId = 'libx264' | 'h264_nvenc' | 'h264_qsv' | 'h264_vaapi';
export interface Trim {
  start: number;
  end: number;
}
export interface VideoInfo {
  id: string;
  path: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  size: number;
  videoCodec: string;
  bitDepth: string;
  hasAudio: boolean;
  previewUrl: string;
  thumbnail?: string;
}
export interface VideoPreset {
  id: PresetId;
  name: string;
  tagline: string;
  detail: string;
  crf: number;
  maxrate: string;
  bufsize: string;
  audio: string;
}
export interface VideoFit {
  id: FitId;
  name: string;
  detail: string;
}
export interface VideoBootstrap {
  ready: boolean;
  error?: string;
  version: string;
  ffmpegPath: string;
  encoders: Record<EncoderId, boolean>;
}
export interface VideoOutput {
  format: 'original' | 'vertical';
  path: string;
  size: number;
}
export interface VideoExportRequest {
  both?: boolean;
  id: string;
  preset: PresetId;
  fit: FitId;
  encoder: EncoderId;
  keepFps: boolean;
  trim: Trim;
  outputDirectory: string;
}
export interface VideoEvent {
  outputs?: VideoOutput[];
  format?: VideoOutput['format'];
  id: string;
  type: 'progress' | 'done' | 'error' | 'canceled';
  percent?: number;
  speed?: string;
  output?: string;
  size?: number;
  error?: string;
}
export type VideoResult<T> = { success: true; value: T } | { success: false; error: string };
