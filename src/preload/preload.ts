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
import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { IpcRendererEvent } from 'electron';
import { IPC } from '@shared/ipc/channels';
import type {
  AppGetInfoResponse,
  AppOpenExternalRequest,
  AppOpenExternalResponse,
  AppOpenPathRequest,
  AppOpenPathResponse,
  AppShowInFolderRequest,
  AppShowInFolderResponse,
  DialogOpenFileRequest,
  DialogOpenFileResponse,
  LogSendRequest,
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
  MenuActionEvent,
  MenuShowWindowMenuRequest,
  NotificationShowRequest,
  NotificationShowResponse,
  AiCompleteRequest,
  AiCompleteResponse,
  AiCancelRequest,
  AiCancelResponse,
  AiStreamChunkEvent,
  DndBlessAndResolveRequest,
  DndBlessAndResolveResponse,
  DndResolvedPath,
  DndResolvePathsRequest,
  DndResolvePathsResponse,
  FsListRequest,
  FsListResponse,
  FsReadRequest,
  FsReadResponse,
  FsStatRequest,
  FsStatResponse,
  FsWriteRequest,
  FsWriteResponse,
} from '@shared/ipc/types';

const api = {
  updateStatus: (): Promise<UpdateResponse> => ipcRenderer.invoke(IPC.UPDATE_STATUS),
  updateCheck: (): Promise<UpdateResponse> => ipcRenderer.invoke(IPC.UPDATE_CHECK),
  updateDownload: (): Promise<UpdateResponse> => ipcRenderer.invoke(IPC.UPDATE_DOWNLOAD),
  updateInstall: (): Promise<UpdateResponse> => ipcRenderer.invoke(IPC.UPDATE_INSTALL),
  onUpdateChanged: (callback: (state: UpdateState) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, state: UpdateState) => callback(state);
    ipcRenderer.on(IPC.UPDATE_CHANGED, listener);
    return () => {
      ipcRenderer.removeListener(IPC.UPDATE_CHANGED, listener);
    };
  },
  videoCheckOutput: (data: VideoCheckOutputRequest): Promise<VideoResult<string>> =>
    ipcRenderer.invoke(IPC.VIDEO_CHECK_OUTPUT, data),
  projectList: (): Promise<VideoResult<ProjectSummary[]>> =>
    ipcRenderer.invoke(IPC.PROJECT_LIST, {}),
  projectSave: (data: ProjectSaveRequest): Promise<VideoResult<ProjectSummary>> =>
    ipcRenderer.invoke(IPC.PROJECT_SAVE, data),
  projectOpen: (data: { id: string }): Promise<VideoResult<OpenProject>> =>
    ipcRenderer.invoke(IPC.PROJECT_OPEN, data),
  videoBootstrap: (): Promise<VideoResult<VideoBootstrap>> =>
    ipcRenderer.invoke(IPC.VIDEO_BOOTSTRAP),
  videoImport: (data: { path: string }): Promise<VideoResult<VideoInfo>> =>
    ipcRenderer.invoke(IPC.VIDEO_IMPORT, data),
  videoThumbnail: (data: { id: string }): Promise<VideoResult<string>> =>
    ipcRenderer.invoke(IPC.VIDEO_THUMBNAIL, data),
  videoPreview: (data: { id: string }): Promise<VideoResult<string>> =>
    ipcRenderer.invoke(IPC.VIDEO_PREVIEW, data),
  videoExport: (data: VideoExportRequest): Promise<VideoResult<string>> =>
    ipcRenderer.invoke(IPC.VIDEO_EXPORT, data),
  videoCancel: (data: { id: string }): Promise<VideoResult<null>> =>
    ipcRenderer.invoke(IPC.VIDEO_CANCEL, data),
  onVideoEvent: (callback: (event: VideoEvent) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, payload: VideoEvent) => callback(payload);
    ipcRenderer.on(IPC.VIDEO_EVENT, listener);
    return () => {
      ipcRenderer.removeListener(IPC.VIDEO_EVENT, listener);
    };
  },
  platform: process.platform,

  appGetInfo: (): Promise<AppGetInfoResponse> => ipcRenderer.invoke(IPC.APP_GET_INFO),

  appOpenExternal: (data: AppOpenExternalRequest): Promise<AppOpenExternalResponse> =>
    ipcRenderer.invoke(IPC.APP_OPEN_EXTERNAL, data),

  appShowInFolder: (data: AppShowInFolderRequest): Promise<AppShowInFolderResponse> =>
    ipcRenderer.invoke(IPC.APP_SHOW_IN_FOLDER, data),

  appOpenPath: (data: AppOpenPathRequest): Promise<AppOpenPathResponse> =>
    ipcRenderer.invoke(IPC.APP_OPEN_PATH, data),

  dialogOpenFile: (data?: DialogOpenFileRequest): Promise<DialogOpenFileResponse> =>
    ipcRenderer.invoke(IPC.DIALOG_OPEN_FILE, data),

  logSend: (data: LogSendRequest): Promise<void> => ipcRenderer.invoke(IPC.LOG_SEND, data),

  settingsGet: (data: SettingsGetRequest): Promise<SettingsGetResponse> =>
    ipcRenderer.invoke(IPC.SETTINGS_GET, data),

  settingsSet: (data: SettingsSetRequest): Promise<SettingsSetResponse> =>
    ipcRenderer.invoke(IPC.SETTINGS_SET, data),

  settingsReset: (): Promise<SettingsResetResponse> => ipcRenderer.invoke(IPC.SETTINGS_RESET),

  onSettingsChange: (callback: (event: SettingsChangeEvent) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, payload: SettingsChangeEvent) => callback(payload);
    ipcRenderer.on(IPC.SETTINGS_ON_CHANGE, listener);
    return () => {
      ipcRenderer.removeListener(IPC.SETTINGS_ON_CHANGE, listener);
    };
  },

  // Secrets: store, delete, and CHECK. The raw value never comes back to the renderer.
  secretHas: (data: SecretHasRequest): Promise<SecretHasResponse> =>
    ipcRenderer.invoke(IPC.SECRET_HAS, data),

  secretSet: (data: SecretSetRequest): Promise<SecretSetResponse> =>
    ipcRenderer.invoke(IPC.SECRET_SET, data),

  secretDelete: (data: SecretDeleteRequest): Promise<SecretDeleteResponse> =>
    ipcRenderer.invoke(IPC.SECRET_DELETE, data),

  secretStatus: (): Promise<SecretStatusResponse> => ipcRenderer.invoke(IPC.SECRET_STATUS),

  themeGet: (): Promise<ThemeGetResponse> => ipcRenderer.invoke(IPC.THEME_GET),

  themeSet: (data: ThemeSetRequest): Promise<ThemeSetResponse> =>
    ipcRenderer.invoke(IPC.THEME_SET, data),

  onThemeChange: (callback: (event: ThemeChangeEvent) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, payload: ThemeChangeEvent) => callback(payload);
    ipcRenderer.on(IPC.THEME_ON_CHANGE, listener);
    return () => {
      ipcRenderer.removeListener(IPC.THEME_ON_CHANGE, listener);
    };
  },

  windowMinimize: (): Promise<void> => ipcRenderer.invoke(IPC.WINDOW_MINIMIZE),

  windowMaximize: (): Promise<void> => ipcRenderer.invoke(IPC.WINDOW_MAXIMIZE),

  windowClose: (): Promise<void> => ipcRenderer.invoke(IPC.WINDOW_CLOSE),

  windowIsMaximized: (): Promise<WindowIsMaximizedResponse> =>
    ipcRenderer.invoke(IPC.WINDOW_IS_MAXIMIZED),

  onWindowMaximizeChange: (callback: (event: WindowMaximizeChangeEvent) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, payload: WindowMaximizeChangeEvent) =>
      callback(payload);
    ipcRenderer.on(IPC.WINDOW_ON_MAXIMIZE_CHANGE, listener);
    return () => {
      ipcRenderer.removeListener(IPC.WINDOW_ON_MAXIMIZE_CHANGE, listener);
    };
  },

  menuShowWindowMenu: (data?: MenuShowWindowMenuRequest): Promise<void> =>
    ipcRenderer.invoke(IPC.MENU_SHOW_WINDOW_MENU, data ?? {}),

  onMenuAction: (callback: (event: MenuActionEvent) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, payload: MenuActionEvent) => callback(payload);
    ipcRenderer.on(IPC.MENU_ACTION, listener);
    return () => {
      ipcRenderer.removeListener(IPC.MENU_ACTION, listener);
    };
  },

  notificationShow: (data: NotificationShowRequest): Promise<NotificationShowResponse> =>
    ipcRenderer.invoke(IPC.NOTIFICATION_SHOW, data),

  aiComplete: (data: AiCompleteRequest): Promise<AiCompleteResponse> =>
    ipcRenderer.invoke(IPC.AI_COMPLETE, data),

  aiCancel: (data: AiCancelRequest): Promise<AiCancelResponse> =>
    ipcRenderer.invoke(IPC.AI_CANCEL, data),

  onAiStreamChunk: (callback: (event: AiStreamChunkEvent) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, payload: AiStreamChunkEvent) => callback(payload);
    ipcRenderer.on(IPC.AI_STREAM_CHUNK, listener);
    return () => {
      ipcRenderer.removeListener(IPC.AI_STREAM_CHUNK, listener);
    };
  },

  // File.path was removed for security in modern Electron; webUtils.getPathForFile
  // is the supported way to map a renderer-side File back to its on-disk path.
  // It returns "" for any File the renderer might have synthesized — only
  // genuine drop / file-input File objects yield a real path. We piggyback on
  // that property: this bridge atomically resolves the path AND blesses it via
  // the preload-only `dnd:bless-and-resolve` channel. The renderer can never
  // directly bless an arbitrary string because that channel is not exposed
  // via window.api.
  dndGetPathForFile: async (file: File): Promise<DndResolvedPath> => {
    const empty: DndResolvedPath = {
      path: '',
      name: '',
      size: 0,
      isFile: false,
      isDirectory: false,
      exists: false,
    };
    const path = webUtils.getPathForFile(file);
    if (!path) return empty;
    const req: DndBlessAndResolveRequest = { path };
    const res: DndBlessAndResolveResponse = await ipcRenderer.invoke(
      IPC.DND_BLESS_AND_RESOLVE,
      req,
    );
    return res.success ? res.resolved : empty;
  },

  // Metadata-only (no privilege grant). Use dndGetPathForFile for drops.
  dndResolvePaths: (data: DndResolvePathsRequest): Promise<DndResolvePathsResponse> =>
    ipcRenderer.invoke(IPC.DND_RESOLVE_PATHS, data),

  fsRead: (data: FsReadRequest): Promise<FsReadResponse> => ipcRenderer.invoke(IPC.FS_READ, data),

  fsWrite: (data: FsWriteRequest): Promise<FsWriteResponse> =>
    ipcRenderer.invoke(IPC.FS_WRITE, data),

  fsList: (data: FsListRequest): Promise<FsListResponse> => ipcRenderer.invoke(IPC.FS_LIST, data),

  fsStat: (data: FsStatRequest): Promise<FsStatResponse> => ipcRenderer.invoke(IPC.FS_STAT, data),
};

contextBridge.exposeInMainWorld('api', api);
