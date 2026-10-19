import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ConfirmDialog, type ConfirmIntent } from '@shared/components/ConfirmDialog';

export interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: ConfirmIntent;
}

interface DialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

interface ActiveDialog extends ConfirmOptions {
  id: number;
  resolve: (value: boolean) => void;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveDialog | null>(null);
  const nextId = useRef(0);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = ++nextId.current;
      setActive({ ...options, id, resolve });
    });
  }, []);

  const finish = useCallback(
    (value: boolean) => {
      setActive((current) => {
        if (current) current.resolve(value);
        return null;
      });
    },
    [],
  );

  const value = useMemo<DialogContextValue>(() => ({ confirm }), [confirm]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      <ConfirmDialog
        isOpen={active !== null}
        title={active?.title ?? ''}
        message={active?.message}
        confirmLabel={active?.confirmLabel}
        cancelLabel={active?.cancelLabel}
        intent={active?.intent}
        onConfirm={() => finish(true)}
        onCancel={() => finish(false)}
      />
    </DialogContext.Provider>
  );
}

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useConfirm must be used within a DialogProvider');
  }
  return context.confirm;
}
