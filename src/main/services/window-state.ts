import windowStateKeeper from 'electron-window-state';
import { logEngine } from '../../logging';

const log = logEngine.createLogger('WindowState');

export type WindowStateKeeper = ReturnType<typeof windowStateKeeper>;

export interface CreateWindowStateOptions {
  defaultWidth: number;
  defaultHeight: number;
}

export function createWindowState(options: CreateWindowStateOptions): WindowStateKeeper {
  const state = windowStateKeeper({
    defaultWidth: options.defaultWidth,
    defaultHeight: options.defaultHeight,
    maximize: true,
  });

  log.info('Window state loaded', {
    width: state.width,
    height: state.height,
    hasPosition: state.x !== undefined && state.y !== undefined,
    isMaximized: state.isMaximized,
    isFullScreen: state.isFullScreen,
  });

  return state;
}
