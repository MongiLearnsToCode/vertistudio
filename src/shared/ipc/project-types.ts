import type { z } from 'zod';
import type { projectSaveSchema } from '@shared/validation/project-schema';
import type { Trim, VideoInfo } from '@shared/video/types';

export type ProjectSaveRequest = z.infer<typeof projectSaveSchema>;
export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
}
export interface OpenProject extends ProjectSummary {
  cuts: { video: VideoInfo; trim: Trim }[];
  options: ProjectSaveRequest['options'];
}
