import { handleUpdateAction } from './update-handlers';
import { handleProjectList, handleProjectSave, handleProjectOpen } from './project-handlers';
import {
  handleVideoBootstrap,
  handleVideoCheckOutput,
  handleVideoImport,
  handleVideoThumbnail,
  handleVideoPreview,
  handleVideoExport,
  handleVideoCancel,
} from './video-handlers';
import { ipcMain } from 'electron';
import { IPC } from '@shared/ipc/channels';
import {
  handleAppGetInfo,
  handleAppOpenExternal,
  handleAppOpenPath,
  handleAppShowInFolder,
} from './app-handlers';
import { handleDialogOpenFile } from './dialog-handlers';
import { handleLogSend } from './log-handlers';
import { handleSettingsGet, handleSettingsReset, handleSettingsSet } from './settings-handlers';
import {
  handleSecretDelete,
  handleSecretHas,
  handleSecretSet,
  handleSecretStatus,
} from './secret-handlers';
import { handleThemeGet, handleThemeSet } from './theme-handlers';
import {
  handleWindowClose,
  handleWindowIsMaximized,
  handleWindowMaximize,
  handleWindowMinimize,
} from './window-handlers';
import { handleMenuShowWindowMenu } from './menu-handlers';
import { handleNotificationShow } from './notification-handlers';
import { handleAiCancel, handleAiComplete } from './ai-handlers';
import { handleDndBlessAndResolve, handleDndResolvePaths } from './dnd-handlers';
import { handleFsList, handleFsRead, handleFsStat, handleFsWrite } from './fs-handlers';

export function registerAllIPC(): void {
  ipcMain.handle(IPC.UPDATE_STATUS, (event) => handleUpdateAction(event, 'status'));
  ipcMain.handle(IPC.UPDATE_CHECK, (event) => handleUpdateAction(event, 'check'));
  ipcMain.handle(IPC.UPDATE_DOWNLOAD, (event) => handleUpdateAction(event, 'download'));
  ipcMain.handle(IPC.UPDATE_INSTALL, (event) => handleUpdateAction(event, 'install'));
  ipcMain.handle(IPC.PROJECT_LIST, handleProjectList);
  ipcMain.handle(IPC.PROJECT_SAVE, handleProjectSave);
  ipcMain.handle(IPC.PROJECT_OPEN, handleProjectOpen);
  ipcMain.handle(IPC.VIDEO_CHECK_OUTPUT, handleVideoCheckOutput);
  ipcMain.handle(IPC.VIDEO_BOOTSTRAP, handleVideoBootstrap);
  ipcMain.handle(IPC.VIDEO_IMPORT, handleVideoImport);
  ipcMain.handle(IPC.VIDEO_THUMBNAIL, handleVideoThumbnail);
  ipcMain.handle(IPC.VIDEO_PREVIEW, handleVideoPreview);
  ipcMain.handle(IPC.VIDEO_EXPORT, handleVideoExport);
  ipcMain.handle(IPC.VIDEO_CANCEL, handleVideoCancel);
  ipcMain.handle(IPC.APP_GET_INFO, handleAppGetInfo);
  ipcMain.handle(IPC.APP_OPEN_EXTERNAL, handleAppOpenExternal);
  ipcMain.handle(IPC.APP_SHOW_IN_FOLDER, handleAppShowInFolder);
  ipcMain.handle(IPC.APP_OPEN_PATH, handleAppOpenPath);
  ipcMain.handle(IPC.DIALOG_OPEN_FILE, handleDialogOpenFile);
  ipcMain.handle(IPC.LOG_SEND, handleLogSend);
  ipcMain.handle(IPC.SETTINGS_GET, handleSettingsGet);
  ipcMain.handle(IPC.SETTINGS_SET, handleSettingsSet);
  ipcMain.handle(IPC.SETTINGS_RESET, handleSettingsReset);
  ipcMain.handle(IPC.SECRET_HAS, handleSecretHas);
  ipcMain.handle(IPC.SECRET_SET, handleSecretSet);
  ipcMain.handle(IPC.SECRET_DELETE, handleSecretDelete);
  ipcMain.handle(IPC.SECRET_STATUS, handleSecretStatus);
  ipcMain.handle(IPC.THEME_GET, handleThemeGet);
  ipcMain.handle(IPC.THEME_SET, handleThemeSet);
  ipcMain.handle(IPC.WINDOW_MINIMIZE, handleWindowMinimize);
  ipcMain.handle(IPC.WINDOW_MAXIMIZE, handleWindowMaximize);
  ipcMain.handle(IPC.WINDOW_CLOSE, handleWindowClose);
  ipcMain.handle(IPC.WINDOW_IS_MAXIMIZED, handleWindowIsMaximized);
  ipcMain.handle(IPC.MENU_SHOW_WINDOW_MENU, handleMenuShowWindowMenu);
  ipcMain.handle(IPC.NOTIFICATION_SHOW, handleNotificationShow);
  ipcMain.handle(IPC.AI_COMPLETE, handleAiComplete);
  ipcMain.handle(IPC.AI_CANCEL, handleAiCancel);
  ipcMain.handle(IPC.DND_RESOLVE_PATHS, handleDndResolvePaths);
  ipcMain.handle(IPC.DND_BLESS_AND_RESOLVE, handleDndBlessAndResolve);
  ipcMain.handle(IPC.FS_READ, handleFsRead);
  ipcMain.handle(IPC.FS_WRITE, handleFsWrite);
  ipcMain.handle(IPC.FS_LIST, handleFsList);
  ipcMain.handle(IPC.FS_STAT, handleFsStat);
}
