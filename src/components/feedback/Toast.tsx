import React from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { Toast } from '../../hooks/useToast';

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const icons = {
  success: <CheckCircle size={18} />,
  error: <AlertCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

export function ToastItem({ toast, onRemove }: ToastItemProps) {
  return (
    <div className={`toast ${toast.type}`} role="alert">
      {icons[toast.type]}
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          opacity: 0.7,
        }}
        aria-label="Fechar notificação"
      >
        <X size={16} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}
