"use client";

import { useEffect } from "react";

type ModalProps = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  labelledBy?: string;
};

export function Modal({ title, children, onClose, labelledBy = "modal-title" }: Readonly<ModalProps>) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-labelledby={labelledBy} aria-modal="true" className="modal-card" role="dialog">
        <button aria-label="Cerrar diálogo" className="icon-button modal-close" onClick={onClose} type="button">
          x
        </button>
        <h2 id={labelledBy}>{title}</h2>
        {children}
      </section>
    </div>
  );
}

type ConfirmDialogProps = {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  tone = "primary",
  onCancel,
  onConfirm
}: Readonly<ConfirmDialogProps>) {
  return (
    <Modal onClose={onCancel} title={title}>
      <div className={`dialog-symbol dialog-symbol-${tone}`} aria-hidden="true">
        {tone === "danger" ? "!" : "✓"}
      </div>
      <div className="dialog-body">{body}</div>
      <div className="modal-actions">
        <button className="button button-ghost" onClick={onCancel} type="button">
          Cancelar
        </button>
        <button className={`button ${tone === "danger" ? "button-danger" : "button-primary"}`} onClick={onConfirm} type="button">
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
