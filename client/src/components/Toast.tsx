import { useEffect } from 'react';

export interface ToastData {
  message: string;
  kind?: 'error';
  undo?: () => void;
}

export default function Toast({ toast, onDismiss }: { toast: ToastData | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(onDismiss, toast.undo ? 6000 : 3500);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div className={`toast${toast.kind === 'error' ? ' toast-error' : ''}`}>
          <span>{toast.message}</span>
          {toast.undo && <button type="button" onClick={() => { toast.undo?.(); onDismiss(); }}>Undo</button>}
        </div>
      )}
    </div>
  );
}
