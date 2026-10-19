import { app } from 'electron';
import path from 'node:path';
import { z } from 'zod';
import { ProjectRepository } from '@main/services/project-repository';
import { fsService } from '@main/services/fs-service';
import { videoService } from '@main/services/video/video-service';
import { projectIdSchema, projectSaveSchema } from '@shared/validation/project-schema';
import type { ProjectSaveRequest } from '@shared/ipc/types';
import type { VideoResult } from '@shared/video/types';
import { logEngine } from '../../logging';

const log = logEngine.createLogger('Projects');
let repository: ProjectRepository | undefined;
function projects() {
  repository ??= new ProjectRepository(
    path.join(app.getPath('userData'), 'projects'),
    (file) => fsService.isAllowed(file),
    (id) => videoService.getVideo(id),
    (file, name) => videoService.importFile(file, name),
  );
  return repository;
}
async function result<T>(operation: () => Promise<T>): Promise<VideoResult<T>> {
  try {
    return { success: true, value: await operation() };
  } catch (error) {
    log.error('Project operation failed', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
export async function handleProjectList(_event: Electron.IpcMainInvokeEvent, data: unknown) {
  return result(async () => {
    z.object({}).strict().parse(data);
    return projects().list();
  });
}
export async function handleProjectSave(
  _event: Electron.IpcMainInvokeEvent,
  data: ProjectSaveRequest,
) {
  return result(async () => projects().save(projectSaveSchema.parse(data)));
}
export async function handleProjectOpen(_event: Electron.IpcMainInvokeEvent, data: { id: string }) {
  return result(async () => projects().open(projectIdSchema.parse(data).id));
}
