import { app, BrowserWindow, Menu, dialog } from 'electron';
import type { MenuItemConstructorOptions } from 'electron';
import { dispatchMenuAction } from './menu-actions';

const isMac = process.platform === 'darwin';

function fileMenu(): MenuItemConstructorOptions {
  const items: MenuItemConstructorOptions[] = [];

  if (!isMac) {
    items.push({
      label: 'Settings…',
      accelerator: 'CmdOrCtrl+,',
      click: () => dispatchMenuAction('settings:open'),
    });
    items.push({ type: 'separator' });
  }

  items.push(isMac ? { role: 'close' } : { role: 'quit' });

  return { label: 'File', submenu: items };
}

function editMenu(): MenuItemConstructorOptions {
  return {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
    ],
  };
}

function viewMenu(): MenuItemConstructorOptions {
  const submenu: MenuItemConstructorOptions[] = [];

  if (!app.isPackaged) {
    submenu.push({ role: 'reload' });
    submenu.push({ role: 'forceReload' });
    submenu.push({ role: 'toggleDevTools' });
    submenu.push({ type: 'separator' });
  }

  submenu.push(
    { role: 'resetZoom' },
    { role: 'zoomIn' },
    { role: 'zoomOut' },
    { type: 'separator' },
    { role: 'togglefullscreen' },
  );

  return { label: 'View', submenu };
}

function windowMenu(): MenuItemConstructorOptions {
  return {
    label: 'Window',
    submenu: isMac
      ? [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }]
      : [{ role: 'minimize' }, { role: 'close' }],
  };
}

function helpMenu(): MenuItemConstructorOptions {
  return {
    label: 'Help',
    submenu: [
      {
        label: 'Using Verti Studio',
        click: () => {
          void dialog.showMessageBox({
            type: 'info',
            title: 'Verti Studio',
            message: 'Import. Cut. Export.',
            detail:
              'Import wide or vertical footage, scrub the preview and set in/out points, choose quality and framing, then pick an export folder. Use Ctrl/Cmd+O to import. FFmpeg and FFprobe must be installed.',
          });
        },
      },
    ],
  };
}

function macAppMenu(): MenuItemConstructorOptions {
  return {
    label: app.getName(),
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      {
        label: 'Settings…',
        accelerator: 'Cmd+,',
        click: () => dispatchMenuAction('settings:open'),
      },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' },
    ],
  };
}

export function buildAppMenu(): Menu {
  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [macAppMenu()] : []),
    fileMenu(),
    editMenu(),
    viewMenu(),
    windowMenu(),
    helpMenu(),
  ];
  return Menu.buildFromTemplate(template);
}

export function popupAppMenuFor(win: BrowserWindow, x?: number, y?: number): void {
  const menu = buildAppMenu();
  menu.popup({
    window: win,
    ...(x !== undefined && y !== undefined ? { x: Math.round(x), y: Math.round(y) } : {}),
  });
}
