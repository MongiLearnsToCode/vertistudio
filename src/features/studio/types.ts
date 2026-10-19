import type { Trim, VideoInfo, VideoOutput } from '@shared/video/types';
export interface QueueItem {
  id: string;
  video: VideoInfo;
  trim: Trim;
  status: 'queued' | 'encoding' | 'done' | 'error' | 'canceled';
  percent: number;
  speed?: string;
  outputs?: VideoOutput[];
  exportFormat?: VideoOutput['format'];
  output?: string;
  outputSize?: number;
  error?: string;
}
