import { useEffect, useRef } from 'react';
import { useLogger } from './useLogger';

// Keyboard shortcut while the app window is focused, e.g.
//   useShortcut({ id: 'search', accelerator: 'CmdOrCtrl+F' }, () => focusSearch());
// CmdOrCtrl means Cmd on Mac, Ctrl elsewhere.
export interface UseShortcutOptions {
  id: string;
  accelerator: string;
  enabled?: boolean;
}

interface ParsedAccelerator {
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
}

function parseAccelerator(accelerator: string): ParsedAccelerator | null {
  const isMac = window.api.platform === 'darwin';
  const parts = accelerator.split('+').map((p) => p.trim());
  if (parts.length === 0) return null;

  const result: ParsedAccelerator = {
    ctrl: false,
    meta: false,
    alt: false,
    shift: false,
    key: '',
  };

  for (const part of parts) {
    const token = part.toLowerCase();
    switch (token) {
      case 'cmdorctrl':
      case 'commandorcontrol':
        if (isMac) result.meta = true;
        else result.ctrl = true;
        break;
      case 'cmd':
      case 'command':
      case 'meta':
      case 'super':
        result.meta = true;
        break;
      case 'ctrl':
      case 'control':
        result.ctrl = true;
        break;
      case 'alt':
      case 'option':
        result.alt = true;
        break;
      case 'shift':
        result.shift = true;
        break;
      default:
        result.key = part;
        break;
    }
  }

  if (!result.key) return null;
  return result;
}

function matchesEvent(parsed: ParsedAccelerator, event: KeyboardEvent): boolean {
  if (event.ctrlKey !== parsed.ctrl) return false;
  if (event.metaKey !== parsed.meta) return false;
  if (event.altKey !== parsed.alt) return false;
  if (event.shiftKey !== parsed.shift) return false;
  const eventKey = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const targetKey = parsed.key.length === 1 ? parsed.key.toLowerCase() : parsed.key;
  return eventKey === targetKey;
}

export function useShortcut(options: UseShortcutOptions, handler: () => void): void {
  const { id, accelerator, enabled = true } = options;
  const handlerRef = useRef(handler);
  const log = useLogger('useShortcut');

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return;
    const parsed = parseAccelerator(accelerator);
    if (!parsed) {
      log.warn('Invalid accelerator', { id, accelerator });
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (matchesEvent(parsed, event)) {
        event.preventDefault();
        handlerRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [id, accelerator, enabled, log]);
}
