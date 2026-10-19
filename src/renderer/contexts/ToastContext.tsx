import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { Toast, type ToastType, type ToastAction } from '@shared/components/Toast';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
  // Override the default 3000ms auto-dismiss. Pass 0 to make the toast
  // persistent (no auto-dismiss) — used for actionable notifications
  // like "Update ready to install" where the user must explicitly act.
  duration?: number;
}

interface ToastContextValue {
  showToast: (
    message: string,
    type: ToastType,
    action?: ToastAction,
    options?: { duration?: number },
  ) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (
      message: string,
      type: ToastType,
      action?: ToastAction,
      options?: { duration?: number },
    ) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type, action, duration: options?.duration }]);
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = { showToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2"
      >
        {toasts.map((toast, index) => (
          <div key={toast.id} style={{ transform: `translateY(-${index * 8}px)` }}>
            <Toast
              message={toast.message}
              type={toast.type}
              action={toast.action}
              duration={toast.duration}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
