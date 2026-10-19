import { useState } from 'react';
import { useSetting } from './useSetting';
import { useToast } from '@renderer/contexts/ToastContext';
import { useLogger } from './useLogger';

export function useDefaultExportDirectory() {
  const [directory, saveDirectory] = useSetting('videoOutputDirectory');
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();
  const log = useLogger('DefaultExportDirectory');
  const report = (issue: unknown) => {
    const message = issue instanceof Error ? issue.message : String(issue);
    setError(message);
    showToast(message, 'error');
    log.error('Saving default export folder failed', issue);
  };
  return {
    directory,
    choosing,
    error,
    choose: async () => {
      if (choosing) return;
      setChoosing(true);
      setError('');
      try {
        const result = await window.api.dialogOpenFile({
          title: 'Choose default export folder',
          directory: true,
        });
        if (!result.canceled && result.filePaths[0]) {
          await saveDirectory(result.filePaths[0]);
          showToast('Default export folder saved', 'success');
        }
      } catch (issue) {
        report(issue);
      } finally {
        setChoosing(false);
      }
    },
    clear: async () => {
      setError('');
      try {
        await saveDirectory('');
      } catch (issue) {
        report(issue);
      }
    },
  };
}
