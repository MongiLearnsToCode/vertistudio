import { registerUpdatePreparation } from '@renderer/lib/update-preparation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '@renderer/contexts/ToastContext';
import { useShortcut } from '@renderer/hooks/useShortcut';
import type { ProjectSaveRequest, ProjectSummary } from '@shared/ipc/types';
import { ProjectSaveQueue, projectFingerprint, type ProjectDraft } from '../project-save-queue';
import type { QueueItem } from '../types';

interface Props {
  items: QueueItem[];
  updateItems: (update: (items: QueueItem[]) => QueueItem[]) => void;
  setSelectedId: (id: string | null) => void;
  resetOutput: () => void;
  options: ProjectSaveRequest['options'];
  applyOptions: (options: ProjectSaveRequest['options']) => Promise<void>;
  busy: boolean;
  report: (error: unknown) => void;
  operationLock: { current: boolean };
}
export function useProjects({
  items,
  updateItems,
  setSelectedId,
  resetOutput,
  options,
  applyOptions,
  busy,
  report,
  operationLock,
}: Props) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [id, setId] = useState<string>();
  const [name, setName] = useState('Untitled project');
  const [working, setWorking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState('');
  const { showToast } = useToast();
  const [queue] = useState(
    () =>
      new ProjectSaveQueue(async (request) => {
        const response = await window.api.projectSave(request);
        if (!response.success) throw new Error(response.error);
        return response.value;
      }),
  );
  const initialName = items[0]?.video.name.replace(/\.[^.]+$/, '').slice(0, 120);
  const snapshot = projectFingerprint({
    name: !id && name === 'Untitled project' ? initialName || name : name,
    cuts: items.map((item) => ({ videoId: item.video.id, trim: item.trim })),
    options,
  });
  const draft = useMemo(() => JSON.parse(snapshot) as ProjectDraft, [snapshot]);
  const dirty = (items.length > 0 || Boolean(id)) && snapshot !== saved;

  const refresh = useCallback(async () => {
    const response = await window.api.projectList();
    if (!response.success) throw new Error(response.error);
    setProjects(
      queue.summary
        ? [queue.summary, ...response.value.filter((entry) => entry.id !== queue.summary?.id)]
        : response.value,
    );
  }, [queue]);
  useEffect(() => {
    void refresh().catch(report);
  }, [refresh, report]);

  const flush = useCallback(async () => {
    const creating = !queue.id;
    setSaving(queue.dirty);
    setSaveError('');
    try {
      await queue.flush();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      setId(queue.id);
      setSaved(queue.saved);
      const summary = queue.summary;
      if (summary) {
        if (creating)
          setName((current) => (current === 'Untitled project' ? summary.name : current));
        setProjects((current) => [summary, ...current.filter((entry) => entry.id !== summary.id)]);
      }
      setSaving(false);
    }
  }, [queue]);
  const save = useCallback(async () => {
    if (operationLock.current) return;
    try {
      await flush();
    } catch (error) {
      report(error);
    }
  }, [flush, operationLock, report]);

  useEffect(() => {
    if (working) return;
    queue.update(draft);
    if (!queue.dirty) return;
    const timer = window.setTimeout(() => {
      void save();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [draft, queue, save, working]);
  useEffect(
    () =>
      registerUpdatePreparation(async () => {
        if (busy || operationLock.current)
          throw new Error('Wait for exports or project changes to finish before updating.');
        await flush();
      }),
    [busy, flush, operationLock],
  );
  useShortcut({ id: 'studio:save-project', accelerator: 'CmdOrCtrl+S' }, () => {
    void save();
  });

  useEffect(() => {
    let closing = false;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!queue.dirty) return;
      event.preventDefault();
      event.returnValue = '';
      if (closing) return;
      closing = true;
      void (async () => {
        try {
          await flush();
          await window.api.windowClose();
        } catch (error) {
          closing = false;
          report(error);
        }
      })();
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [queue, flush, report]);

  const switchProject = async (nextId?: string) => {
    if (busy || operationLock.current) return;
    operationLock.current = true;
    setWorking(true);
    try {
      await flush();
      if (!nextId) {
        const empty: ProjectDraft = { name: 'Untitled project', cuts: [], options };
        queue.restore(undefined, empty);
        resetOutput();
        updateItems(() => []);
        setSelectedId(null);
        setId(undefined);
        setName('Untitled project');
        setSaved('');
        setSaveError('');
        return;
      }
      const response = await window.api.projectOpen({ id: nextId });
      if (!response.success) throw new Error(response.error);
      const project = response.value;
      await applyOptions(project.options);
      const restored: QueueItem[] = project.cuts.map((cut) => ({
        id: crypto.randomUUID(),
        ...cut,
        status: 'queued',
        percent: 0,
      }));
      queue.restore(project.id, {
        name: project.name,
        cuts: project.cuts.map((cut) => ({ videoId: cut.video.id, trim: cut.trim })),
        options: project.options,
      });
      resetOutput();
      updateItems(() => restored);
      setSelectedId(restored[0]?.id ?? null);
      setId(project.id);
      setName(project.name);
      setSaved(queue.saved);
      setSaveError('');
      showToast('Project opened. Changes will save automatically.', 'success');
    } catch (error) {
      report(error);
    } finally {
      operationLock.current = false;
      setWorking(false);
    }
  };
  return { projects, id, name, setName, working, saving, saveError, dirty, save, switchProject };
}
