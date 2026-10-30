import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  /** Extra actions shown before Cancel, e.g. "Sync now". */
  actions?: ReactNode;
  confirmLabel: string;
  /** When set, the user must type this word to enable the confirm button. */
  confirmPhrase?: string;
  /** Destructive actions use "danger" (the default). */
  tone?: 'danger' | 'primary';
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
  tone = 'danger',
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
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-primary-200 bg-white p-0 shadow-lg backdrop:bg-primary-900/50"
    >
      <div className="p-6 space-y-4">
        <h2 id={titleId} className="text-lg font-semibold text-brand-tertiary">
          {title}
        </h2>
        <div className="text-sm text-primary-600 space-y-2">{children}</div>

        {confirmPhrase && (
          <div>
            <label htmlFor={phraseId} className="block text-sm text-primary-700 mb-1">
              Type <span className="font-mono font-semibold">{confirmPhrase}</span> to
              confirm
            </label>
            <input
              id={phraseId}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              className="block w-full rounded-md border border-primary-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {actions}
          <Button type="button" variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={tone}
            onClick={() => {
              setTyped('');
              onConfirm();
            }}
            disabled={!canConfirm}
            isLoading={isConfirming}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
