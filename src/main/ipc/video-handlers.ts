import { exportDirectory } from '@main/services/default-export-directory';
import type { VideoCheckOutputRequest } from '@shared/ipc/types';
import { videoService } from '../services/video/video-service';
import { engineStatus } from '../services/video/ffmpeg-tools';
import { videoPathSchema, videoIdSchema, videoExportSchema } from '@shared/validation/video-schema';
import { IPC } from '@shared/ipc/channels';
import { logEngine } from '../../logging';
import type {
  VideoResult,
  VideoBootstrap,
  VideoInfo,
  VideoExportRequest,
} from '@shared/video/types';
const log = logEngine.createLogger('VideoHandlers');
async function result<T>(operation: () => Promise<T>): Promise<VideoResult<T>> {
  try {
    return { success: true, value: await operation() };
  } catch (error) {
    log.error('Video operation failed', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
export async function handleVideoCheckOutput(
  _event: Electron.IpcMainInvokeEvent,
  data: VideoCheckOutputRequest,
): Promise<VideoResult<string>> {
  return result(async () => exportDirectory.check(videoPathSchema.parse(data).path));
}
export async function handleVideoBootstrap(): Promise<VideoResult<VideoBootstrap>> {
  return result(engineStatus);
}
export async function handleVideoImport(
  _event: Electron.IpcMainInvokeEvent,
  data: { path: string },
): Promise<VideoResult<VideoInfo>> {
  return result(async () => videoService.importFile(videoPathSchema.parse(data).path));
}
export async function handleVideoThumbnail(
  _event: Electron.IpcMainInvokeEvent,
  data: { id: string },
): Promise<VideoResult<string>> {
  return result(async () => videoService.thumbnail(videoIdSchema.parse(data).id));
}
export async function handleVideoPreview(
  _event: Electron.IpcMainInvokeEvent,
  data: { id: string },
): Promise<VideoResult<string>> {
  return result(async () => videoService.preview(videoIdSchema.parse(data).id));
}
export async function handleVideoExport(
  event: Electron.IpcMainInvokeEvent,
  data: VideoExportRequest,
): Promise<VideoResult<string>> {
  return result(async () => {
    const request = videoExportSchema.parse(data);
    request.outputDirectory = await exportDirectory.check(request.outputDirectory);
    return videoService.start(request, (update) => {
      if (!event.sender.isDestroyed()) event.sender.send(IPC.VIDEO_EVENT, update);
    });
  });
}
export async function handleVideoCancel(
  _event: Electron.IpcMainInvokeEvent,
  data: { id: string },
): Promise<VideoResult<null>> {
  return result(async () => {
    videoService.cancel(videoIdSchema.parse(data).id);
    return null;
  });
}
