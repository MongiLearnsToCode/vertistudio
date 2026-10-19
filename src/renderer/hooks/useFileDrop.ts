import { useCallback, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { useLogger } from './useLogger';
import type { DndResolvedPath } from '@shared/ipc/types';

export type { DndResolvedPath };

export interface UseFileDropOptions {
  onDrop: (paths: DndResolvedPath[]) => void | Promise<void>;
  disabled?: boolean;
}

export interface UseFileDropBind {
  onDragEnter: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}

export interface UseFileDropResult {
  isDragOver: boolean;
  bind: UseFileDropBind;
}

function isFileDrag(e: DragEvent): boolean {
  return Array.from(e.dataTransfer.types).includes('Files');
}

export function useFileDrop({ onDrop, disabled = false }: UseFileDropOptions): UseFileDropResult {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragDepth = useRef(0);
  const log = useLogger('useFileDrop');

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      if (disabled || !isFileDrag(e)) return;
      e.preventDefault();
      dragDepth.current += 1;
      if (dragDepth.current === 1) setIsDragOver(true);
    },
    [disabled],
  );

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      if (disabled || !isFileDrag(e)) return;
      // dragover MUST preventDefault for drop to fire.
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    },
    [disabled],
  );

  const handleDragLeave = useCallback(
    (e: DragEvent) => {
      if (disabled || !isFileDrag(e)) return;
      e.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setIsDragOver(false);
    },
    [disabled],
  );

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      dragDepth.current = 0;
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      // dndGetPathForFile bundles webUtils.getPathForFile + bless + stat into
      // a single round trip so the path that gets blessed is provably from a
      // real File drop event (synthetic Files yield ""). The renderer can't
      // reach the underlying bless channel any other way.
      const items: DndResolvedPath[] = [];
      for (const f of files) {
        try {
          const item = await window.api.dndGetPathForFile(f);
          if (item.path) items.push(item);
        } catch (err) {
          log.warn('getPathForFile failed', { name: f.name, error: String(err) });
        }
      }

      if (items.length === 0) {
        log.warn('Drop produced no resolvable paths', { fileCount: files.length });
        return;
      }

      await onDrop(items);
    },
    [disabled, onDrop, log],
  );

  return {
    isDragOver,
    bind: {
      onDragEnter: handleDragEnter,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  };
}
