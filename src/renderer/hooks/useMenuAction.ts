import { useEffect } from 'react';
import type { MenuAction, MenuActionEvent } from '@shared/ipc/types';

export function useMenuAction(handler: (action: MenuAction) => void): void {
  useEffect(() => {
    const off = window.api.onMenuAction((event: MenuActionEvent) => {
      handler(event.action);
    });
    return off;
  }, [handler]);
}
