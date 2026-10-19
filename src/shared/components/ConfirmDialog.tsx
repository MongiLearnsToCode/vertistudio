import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export type ConfirmIntent = 'default' | 'danger';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: ConfirmIntent;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  intent = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div className="space-y-4 max-w-[360px]">
        {message && (
          <div className="text-[12px] text-text-secondary leading-relaxed">{message}</div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          {intent === 'danger' ? (
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-[6px] cursor-pointer transition-colors duration-150 px-[10px] py-[4px] text-white border-none hover:opacity-90"
              style={{ fontSize: 11, backgroundColor: 'var(--color-accent-red)' }}
            >
              {confirmLabel}
            </button>
          ) : (
            <Button variant="primary" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
