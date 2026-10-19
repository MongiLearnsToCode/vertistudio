import { promises as fs } from 'node:fs';
import { dialog, BrowserWindow } from 'electron';
import { fsService } from '../services/fs-service';
import type { DialogOpenFileRequest, DialogOpenFileResponse } from '@shared/ipc/types';

export async function handleDialogOpenFile(
  event: Electron.IpcMainInvokeEvent,
  data?: DialogOpenFileRequest,
): Promise<DialogOpenFileResponse> {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);
    const properties: Electron.OpenDialogOptions['properties'] = [
      data?.directory ? 'openDirectory' : 'openFile',
    ];

    if (data?.multiSelections) {
      properties.push('multiSelections');
    }

    const result = await dialog.showOpenDialog(win!, {
      title: data?.title ?? (data?.directory ? 'Choose Folder' : 'Open File'),
      filters: data?.filters,
      properties,
    });

    const filePaths = result.canceled
      ? []
      : await Promise.all(result.filePaths.map((file) => fs.realpath(file)));
    for (const file of filePaths) fsService.bless(file);

    return {
      filePaths,
      canceled: result.canceled,
    };
  } catch (_err) {
    return { filePaths: [], canceled: true };
  }
}
