import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  icon?: string;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmDanger?: boolean;
}

export function Modal({
  open,
  icon,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  confirmDanger = false,
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {icon && <div className="modal-icon">{icon}</div>}
        <h2 className="modal-title" id="modal-title">{title}</h2>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button
            className="btn btn-full"
            style={
              confirmDanger
                ? { background: 'var(--color-error)', color: '#fff' }
                : { background: 'linear-gradient(135deg,var(--color-primary),var(--color-secondary))', color: '#fff' }
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
          <button className="btn btn-secondary btn-full" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
