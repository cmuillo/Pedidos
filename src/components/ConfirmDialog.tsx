"use client";
import { useEffect, useRef } from "react";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  destructive = true,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    // Prevent background scroll while the modal is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-[fadeIn_0.15s_ease-out]"
      onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm rounded-2xl bg-surface shadow-xl border p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          {message && <p className="text-sm text-muted">{message}</p>}
        </div>
        <div className="flex gap-2">
          <button
            className="flex-1 py-2.5 rounded-lg border font-medium hover:bg-surface-2 transition-colors"
            onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            className={`flex-1 py-2.5 rounded-lg font-medium text-accent-fg transition-colors ${
              destructive ? "bg-danger hover:opacity-90" : "bg-accent hover:bg-accent-hover"
            }`}
            onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
