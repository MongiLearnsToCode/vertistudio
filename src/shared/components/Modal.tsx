import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Icon } from '@renderer/components/Icon';
import type { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-modal bg-black/50 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-modal bg-app-surface border border-border rounded-lg min-w-[320px] shadow-xl focus:outline-none">
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '0.5px solid var(--color-border)' }}
          >
            <DialogPrimitive.Title className="text-[13px] font-medium text-text-primary">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close"
              className="text-text-muted hover:text-text-primary transition-colors p-1 -m-1 rounded hover:bg-app-hover cursor-pointer"
            >
              <Icon icon={X} size={14} />
            </DialogPrimitive.Close>
          </div>
          <div className="p-4">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
