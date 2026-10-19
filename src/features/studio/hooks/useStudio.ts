import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@renderer/contexts/ToastContext';
import { useLogger } from '@renderer/hooks/useLogger';
import { useOutputDirectory } from './useOutputDirectory';
import { useExportOptions } from './useExportOptions';
import { useShortcut } from '@renderer/hooks/useShortcut';
import type { VideoBootstrap, VideoEvent, Trim } from '@shared/video/types';
import { trimRange } from '@shared/video/presets';
import { useProjects } from './useProjects';
import type { QueueItem } from '../types';

export function useStudio() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [engine, setEngine] = useState<VideoBootstrap | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const itemsRef = useRef(items);
  const runLock = useRef(false);
  const projectLock = useRef(false);
  const importLock = useRef(false);
  const activeCut = useRef<string | null>(null);
  const stopBatch = useRef(false);
  const waiters = useRef(new Map<string, (event: VideoEvent) => void>());
  const { showToast } = useToast();
  const log = useLogger('Studio');
  const report = useCallback(
    (issue: unknown) => {
      const message = issue instanceof Error ? issue.message : String(issue);
      setError(message);
      showToast(message, 'error');
      log.error('Video operation failed', issue);
    },
    [showToast, log],
  );
  const outputDirectory = useOutputDirectory(report);
  const { output } = outputDirectory;
  const exportOptions = useExportOptions(report);
  const { preset, fit, encoder, keepFps, both } = exportOptions;
  const updateItems = useCallback((update: (current: QueueItem[]) => QueueItem[]) => {
    const next = update(itemsRef.current);
    itemsRef.current = next;
    setItems(next);
  }, []);
  useEffect(() => {
    let disposed = false;
    void (async () => {
      try {
        const response = await window.api.videoBootstrap();
        if (disposed) return;
        if (response.success) setEngine(response.value);
        else report(response.error);
      } catch (issue) {
        if (!disposed) report(issue);
      }
    })();
    return () => {
      disposed = true;
    };
  }, [report]);
  useEffect(
    () =>
      window.api.onVideoEvent((event) => {
        updateItems((current) =>
          current.map((item) => {
            if (item.id !== activeCut.current || item.video.id !== event.id) return item;
            if (event.type === 'progress')
              return {
                ...item,
                percent: event.percent ?? item.percent,
                speed: event.speed ?? item.speed,
                outputs: event.outputs ?? item.outputs,
                exportFormat: event.format ?? item.exportFormat,
                output: event.output ?? item.output,
                outputSize: event.size ?? item.outputSize,
              };
            return {
              ...item,
              status:
                event.type === 'done' ? 'done' : event.type === 'canceled' ? 'canceled' : 'error',
              percent: event.type === 'done' ? 100 : item.percent,
              output: event.output ?? item.output,
              outputSize: event.size,
              outputs: event.outputs ?? item.outputs,
              exportFormat: event.format ?? item.exportFormat,
              error: event.type === 'error' ? event.error : undefined,
            };
          }),
        );
        if (event.type !== 'progress') {
          waiters.current.get(event.id)?.(event);
          waiters.current.delete(event.id);
          if (event.type === 'done')
            showToast(
              event.outputs?.length === 2 ? 'Both versions exported' : 'Video exported',
              'success',
            );
          if (event.type === 'error') showToast(event.error ?? 'Export failed', 'error');
        }
      }),
    [updateItems, showToast],
  );

  const importPaths = useCallback(
    async (paths: string[]) => {
      if (runLock.current || projectLock.current || importLock.current) return;
      importLock.current = true;
      setLoading(true);
      setError('');
      try {
        for (const file of paths) {
          try {
            const response = await window.api.videoImport({ path: file });
            if (!response.success) {
              report(response.error);
              continue;
            }
            const video = response.value;
            if (itemsRef.current.some((item) => item.video.path === video.path)) {
              showToast(`${video.name} is already imported`, 'info');
              continue;
            }
            updateItems((current) => [
              ...current,
              {
                id: video.id,
                video,
                trim: { start: 0, end: video.duration },
                status: 'queued',
                percent: 0,
              },
            ]);
            setSelectedId((current) => current ?? video.id);
            void (async () => {
              try {
                const thumb = await window.api.videoThumbnail({ id: video.id });
                if (thumb.success)
                  updateItems((current) =>
                    current.map((item) =>
                      item.video.path === video.path
                        ? { ...item, video: { ...item.video, thumbnail: thumb.value } }
                        : item,
                    ),
                  );
                else log.warn('Thumbnail unavailable', { error: thumb.error });
              } catch (issue) {
                log.warn('Thumbnail unavailable', { error: String(issue) });
              }
            })();
          } catch (issue) {
            report(issue);
          }
        }
      } finally {
        importLock.current = false;
        setLoading(false);
      }
    },
    [updateItems, showToast, report, log],
  );
  const pickFiles = useCallback(async () => {
    if (projectLock.current || runLock.current || importLock.current) return;
    try {
      const result = await window.api.dialogOpenFile({
        title: 'Import videos',
        multiSelections: true,
        filters: [
          { name: 'Video', extensions: ['mov', 'mp4', 'm4v', 'mkv', 'avi', 'webm', 'mts', 'mxf'] },
          { name: 'All files', extensions: ['*'] },
        ],
      });
      if (!result.canceled) await importPaths(result.filePaths);
    } catch (issue) {
      report(issue);
    }
  }, [importPaths, report]);
  useShortcut({ id: 'studio:import', accelerator: 'CmdOrCtrl+O' }, () => {
    void pickFiles();
  });
  const changeTrim = useCallback(
    (id: string, trim: Trim) => {
      const item = itemsRef.current.find((entry) => entry.id === id);
      if (!item || item.status === 'encoding' || runLock.current || projectLock.current) return;
      try {
        trimRange(item.video, trim);
        updateItems((current) =>
          current.map((entry) =>
            entry.id === id
              ? { ...entry, trim, status: 'queued', percent: 0, error: undefined }
              : entry,
          ),
        );
      } catch (issue) {
        report(issue);
      }
    },
    [report, updateItems],
  );
  const cancel = useCallback(
    async (id: string) => {
      try {
        const item = itemsRef.current.find((entry) => entry.id === id);
        if (!item) return;
        const result = await window.api.videoCancel({ id: item.video.id });
        if (!result.success) report(result.error);
      } catch (issue) {
        report(issue);
      }
    },
    [report],
  );
  const cancelAll = useCallback(() => {
    stopBatch.current = true;
    for (const item of itemsRef.current) if (item.status === 'encoding') void cancel(item.id);
  }, [cancel]);
  const remove = useCallback(
    (id: string) => {
      if (runLock.current || projectLock.current || importLock.current) return;
      updateItems((current) => current.filter((item) => item.id !== id));
      setSelectedId((current) => (current === id ? (itemsRef.current[0]?.id ?? null) : current));
    },
    [updateItems],
  );
  const clear = useCallback(() => {
    if (!runLock.current && !projectLock.current && !importLock.current) {
      updateItems(() => []);
      setSelectedId(null);
    }
  }, [updateItems]);
  const exportAll = useCallback(async () => {
    if (runLock.current || projectLock.current || importLock.current) return;
    if (!output || outputDirectory.outputChecking || outputDirectory.outputError) {
      report(
        outputDirectory.outputError ||
          (outputDirectory.outputChecking
            ? 'Wait for the export folder check to finish.'
            : 'Choose an export folder first.'),
      );
      return;
    }
    if (!engine?.ready) {
      report('Install FFmpeg and FFprobe before exporting.');
      return;
    }
    runLock.current = true;
    stopBatch.current = false;
    setRunning(true);
    setError('');
    const queue = itemsRef.current.filter((item) => item.status === 'queued');
    try {
      for (const item of queue) {
        if (stopBatch.current) break;
        const id = item.id;
        activeCut.current = id;
        updateItems((current) =>
          current.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  status: 'encoding',
                  percent: 0,
                  outputs: undefined,
                  exportFormat: undefined,
                  output: undefined,
                  outputSize: undefined,
                  error: undefined,
                }
              : entry,
          ),
        );
        let finish: (event: VideoEvent) => void = () => {};
        const terminal = new Promise<VideoEvent>((resolve) => {
          finish = resolve;
        });
        waiters.current.set(item.video.id, finish);
        try {
          const result = await window.api.videoExport({
            id: item.video.id,
            preset,
            fit,
            encoder,
            keepFps,
            both,
            trim: item.trim,
            outputDirectory: output,
          });
          if (!result.success) throw new Error(result.error);
          updateItems((current) =>
            current.map((entry) =>
              entry.id === id ? { ...entry, output: result.value || entry.output } : entry,
            ),
          );
          await terminal;
        } catch (issue) {
          waiters.current.delete(item.video.id);
          updateItems((current) =>
            current.map((entry) =>
              entry.id === id ? { ...entry, status: 'error', error: String(issue) } : entry,
            ),
          );
          report(issue);
        }
      }
    } finally {
      activeCut.current = null;
      runLock.current = false;
      setRunning(false);
    }
  }, [
    output,
    outputDirectory.outputChecking,
    outputDirectory.outputError,
    engine,
    preset,
    fit,
    encoder,
    keepFps,
    both,
    updateItems,
    report,
  ]);
  const reveal = useCallback(
    async (item: QueueItem) => {
      try {
        const result = await window.api.appShowInFolder({ path: item.output ?? item.video.path });
        if (!result.success) report(result.error);
      } catch (issue) {
        report(issue);
      }
    },
    [report],
  );
  const open = useCallback(
    async (item: QueueItem) => {
      if (!item.output) return;
      try {
        const result = await window.api.appOpenPath({ path: item.output });
        if (!result.success) report(result.error);
      } catch (issue) {
        report(issue);
      }
    },
    [report],
  );
  const projects = useProjects({
    items,
    updateItems,
    setSelectedId,
    resetOutput: outputDirectory.resetOutput,
    options: { preset, fit, encoder, keepFps, both },
    applyOptions: exportOptions.applyOptions,
    busy: loading || running,
    report,
    operationLock: projectLock,
  });
  const newShort = () => {
    if (loading || runLock.current || projectLock.current) return;
    const source = itemsRef.current.find((item) => item.id === selectedId);
    if (!source) return;
    const id = crypto.randomUUID();
    updateItems((current) => [
      ...current,
      {
        id,
        video: source.video,
        trim: { start: 0, end: source.video.duration },
        status: 'queued',
        percent: 0,
      },
    ]);
    setSelectedId(id);
  };
  return {
    projects,
    ...exportOptions,
    ...outputDirectory,
    newShort,
    items,
    selected: items.find((item) => item.id === selectedId),
    selectedId,
    setSelectedId,
    engine,
    error,
    loading,
    running,
    importPaths,
    pickFiles,
    changeTrim,
    cancel,
    cancelAll,
    remove,
    clear,
    exportAll,
    reveal,
    open,
  };
}
export type StudioController = ReturnType<typeof useStudio>;
