import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  /** Extra actions shown before Cancel, e.g. "Sync now". */
  actions?: ReactNode;
  confirmLabel: string;
  /** When set, the user must type this word to enable the confirm button. */
  confirmPhrase?: string;
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A modal confirmation built on the native <dialog> element. */
export function ConfirmDialog({
  open,
  title,
  children,
  actions,
  confirmLabel,
  confirmPhrase,
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const phraseId = useId();
  const [typed, setTyped] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const canConfirm = !confirmPhrase || typed === confirmPhrase;

  const handleCancel = () => {
    setTyped('');
    onCancel();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        handleCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-primary-200 bg-white p-0 shadow-lg backdrop:bg-slate-900/50"
    >
      <div className="p-6 space-y-4">
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <div className="text-sm text-slate-600 space-y-2">{children}</div>

        {confirmPhrase && (
          <div>
            <label htmlFor={phraseId} className="block text-sm text-slate-700 mb-1">
              Type <span className="font-mono font-semibold">{confirmPhrase}</span> to
              confirm
            </label>
            <input
              id={phraseId}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {actions}
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-primary-300 bg-white text-primary-700 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setTyped('');
              onConfirm();
            }}
            disabled={!canConfirm || isConfirming}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-error-600 text-white hover:bg-error-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-500"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
