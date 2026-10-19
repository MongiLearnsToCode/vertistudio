import { useSetting } from '@renderer/hooks/useSetting';
import type { ProjectSaveRequest } from '@shared/ipc/types';

export function useExportOptions(report: (error: unknown) => void) {
  const [preset, savePreset] = useSetting('videoPreset');
  const [fit, saveFit] = useSetting('videoFit');
  const [encoder, saveEncoder] = useSetting('videoEncoder');
  const [keepFps, saveKeepFps] = useSetting('videoKeepFps');
  const [both, saveBoth] = useSetting('videoBoth');
  return {
    preset,
    fit,
    encoder,
    keepFps,
    both,
    applyOptions: async (options: ProjectSaveRequest['options']) => {
      await savePreset(options.preset);
      await saveFit(options.fit);
      await saveEncoder(options.encoder);
      await saveKeepFps(options.keepFps);
      await saveBoth(options.both ?? false);
    },
    setPreset: (value: typeof preset) => {
      void savePreset(value).catch(report);
    },
    setFit: (value: typeof fit) => {
      void saveFit(value).catch(report);
    },
    setEncoder: (value: typeof encoder) => {
      void saveEncoder(value).catch(report);
    },
    setKeepFps: (value: boolean) => {
      void saveKeepFps(value).catch(report);
    },
    setAspectRatio: (mode: 'original' | 'vertical' | 'both') => {
      void (async () => {
        await saveBoth(mode === 'both');
        if (mode === 'original') await saveFit('keep');
        else if (fit === 'keep') await saveFit('auto');
      })().catch(report);
    },
  };
}
