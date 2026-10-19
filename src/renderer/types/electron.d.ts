import type { UpdateState, UpdateResponse } from '@shared/ipc/types';
import type { VideoCheckOutputRequest } from '@shared/ipc/types';
import type { ProjectSaveRequest, ProjectSummary, OpenProject } from '@shared/ipc/types';
import type {
  VideoBootstrap,
  VideoResult,
  VideoInfo,
  VideoExportRequest,
  VideoEvent,
} from '@shared/ipc/types';
// The typed surface the preload bridge exposes as `window.api`.
// Keep in step with src/preload/preload.ts (one line per function).
import type {
  AiCancelRequest,
  AiCancelResponse,
  AiCompleteRequest,
  AiCompleteResponse,
  AiStreamChunkEvent,
  AppGetInfoResponse,
  AppOpenExternalRequest,
  AppOpenExternalResponse,
  AppOpenPathRequest,
  AppOpenPathResponse,
  AppShowInFolderRequest,
  AppShowInFolderResponse,
  DialogOpenFileRequest,
  DialogOpenFileResponse,
  DndResolvePathsRequest,
  DndResolvePathsResponse,
  DndResolvedPath,
  FsListRequest,
  FsListResponse,
  FsReadRequest,
  FsReadResponse,
  FsStatRequest,
  FsStatResponse,
  FsWriteRequest,
  FsWriteResponse,
  LogSendRequest,
  MenuActionEvent,
  MenuShowWindowMenuRequest,
  NotificationShowRequest,
  NotificationShowResponse,
  SecretDeleteRequest,
  SecretDeleteResponse,
  SecretHasRequest,
  SecretHasResponse,
  SecretSetRequest,
  SecretSetResponse,
  SecretStatusResponse,
  SettingsChangeEvent,
  SettingsGetRequest,
  SettingsGetResponse,
  SettingsResetResponse,
  SettingsSetRequest,
  SettingsSetResponse,
  ThemeChangeEvent,
  ThemeGetResponse,
  ThemeSetRequest,
  ThemeSetResponse,
  WindowIsMaximizedResponse,
  WindowMaximizeChangeEvent,
} from '@shared/ipc/types';

export interface ElectronAPI {
  updateStatus: () => Promise<UpdateResponse>;
  updateCheck: () => Promise<UpdateResponse>;
  updateDownload: () => Promise<UpdateResponse>;
  updateInstall: () => Promise<UpdateResponse>;
  onUpdateChanged: (callback: (state: UpdateState) => void) => () => void;
  videoCheckOutput: (data: VideoCheckOutputRequest) => Promise<VideoResult<string>>;
  projectList: () => Promise<VideoResult<ProjectSummary[]>>;
  projectSave: (data: ProjectSaveRequest) => Promise<VideoResult<ProjectSummary>>;
  projectOpen: (data: { id: string }) => Promise<VideoResult<OpenProject>>;
  videoBootstrap: () => Promise<VideoResult<VideoBootstrap>>;
  videoImport: (data: { path: string }) => Promise<VideoResult<VideoInfo>>;
  videoThumbnail: (data: { id: string }) => Promise<VideoResult<string>>;
  videoPreview: (data: { id: string }) => Promise<VideoResult<string>>;
  videoExport: (data: VideoExportRequest) => Promise<VideoResult<string>>;
  videoCancel: (data: { id: string }) => Promise<VideoResult<null>>;
  onVideoEvent: (callback: (event: VideoEvent) => void) => () => void;
  platform: NodeJS.Platform;
  appGetInfo: () => Promise<AppGetInfoResponse>;
  appOpenExternal: (data: AppOpenExternalRequest) => Promise<AppOpenExternalResponse>;
  appShowInFolder: (data: AppShowInFolderRequest) => Promise<AppShowInFolderResponse>;
  appOpenPath: (data: AppOpenPathRequest) => Promise<AppOpenPathResponse>;
  dialogOpenFile: (data?: DialogOpenFileRequest) => Promise<DialogOpenFileResponse>;
  logSend: (data: LogSendRequest) => Promise<void>;
  settingsGet: (data: SettingsGetRequest) => Promise<SettingsGetResponse>;
  settingsSet: (data: SettingsSetRequest) => Promise<SettingsSetResponse>;
  settingsReset: () => Promise<SettingsResetResponse>;
  onSettingsChange: (callback: (event: SettingsChangeEvent) => void) => () => void;
  secretHas: (data: SecretHasRequest) => Promise<SecretHasResponse>;
  secretSet: (data: SecretSetRequest) => Promise<SecretSetResponse>;
  secretDelete: (data: SecretDeleteRequest) => Promise<SecretDeleteResponse>;
  secretStatus: () => Promise<SecretStatusResponse>;
  themeGet: () => Promise<ThemeGetResponse>;
  themeSet: (data: ThemeSetRequest) => Promise<ThemeSetResponse>;
  onThemeChange: (callback: (event: ThemeChangeEvent) => void) => () => void;
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<WindowIsMaximizedResponse>;
  onWindowMaximizeChange: (callback: (event: WindowMaximizeChangeEvent) => void) => () => void;
  menuShowWindowMenu: (data?: MenuShowWindowMenuRequest) => Promise<void>;
  onMenuAction: (callback: (event: MenuActionEvent) => void) => () => void;
  notificationShow: (data: NotificationShowRequest) => Promise<NotificationShowResponse>;
  aiComplete: (data: AiCompleteRequest) => Promise<AiCompleteResponse>;
  aiCancel: (data: AiCancelRequest) => Promise<AiCancelResponse>;
  onAiStreamChunk: (callback: (event: AiStreamChunkEvent) => void) => () => void;
  dndGetPathForFile: (file: File) => Promise<DndResolvedPath>;
  dndResolvePaths: (data: DndResolvePathsRequest) => Promise<DndResolvePathsResponse>;
  fsRead: (data: FsReadRequest) => Promise<FsReadResponse>;
  fsWrite: (data: FsWriteRequest) => Promise<FsWriteResponse>;
  fsList: (data: FsListRequest) => Promise<FsListResponse>;
  fsStat: (data: FsStatRequest) => Promise<FsStatResponse>;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
