import { useCallback, useEffect, useRef, useState } from 'react';
import { useSetting } from '@renderer/hooks/useSetting';

export function useOutputDirectory(report: (error: unknown) => void) {
  const [defaultDirectory] = useSetting('videoOutputDirectory');
  const [override, setOverride] = useState<string | null>(null);
  const output = override ?? defaultDirectory;
  const [checked, setChecked] = useState({ path: '', checking: false, error: '' });
  const generation = useRef(0);
  const validate = useCallback(async () => {
    const current = ++generation.current;
    if (!output) {
      setChecked({ path: '', checking: false, error: '' });
      return;
    }
    setChecked({ path: output, checking: true, error: '' });
    try {
      const result = await window.api.videoCheckOutput({ path: output });
      if (current === generation.current)
        setChecked({ path: output, checking: false, error: result.success ? '' : result.error });
    } catch (error) {
      if (current !== generation.current) return;
      setChecked({
        path: output,
        checking: false,
        error: 'Could not check the export folder. Choose it again.',
      });
      report(error);
    }
  }, [output, report]);
  const cancelValidation = useCallback(() => {
    generation.current++;
  }, []);
  useEffect(() => {
    void validate();
    const focus = () => {
      void validate();
    };
    window.addEventListener('focus', focus);
    return () => {
      cancelValidation();
      window.removeEventListener('focus', focus);
    };
  }, [validate, cancelValidation]);
  return {
    output,
    outputChecking: Boolean(output) && (checked.path !== output || checked.checking),
    outputError: checked.path === output ? checked.error : '',
    usingDefaultOutput: override === null && Boolean(defaultDirectory),
    resetOutput: () => setOverride(null),
    chooseOutput: async () => {
      try {
        const result = await window.api.dialogOpenFile({
          title: 'Choose export folder',
          directory: true,
        });
        if (!result.canceled && result.filePaths[0]) setOverride(result.filePaths[0]);
      } catch (error) {
        report(error);
      }
    },
  };
}
