import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { ApiClientError } from "../lib/api-client";
import { missingRole, ROLE_LABELS } from "../lib/navItems";
import { ConfirmDialog } from "./ui/ConfirmDialog";

const ROLE_DESCRIPTIONS = {
  OWNER: "register your own equipment, print QR labels, and view its service history",
  TECHNICIAN: "record service visits on equipment you scan",
} as const;

interface AddRoleActionProps {
  /** Classes for the trigger, so it matches the menu it sits in. */
  className: string;
  /** Called before the dialog opens, e.g. to close a menu. */
  onOpen?: () => void;
}

/** Lets a signed-in user add the role they do not hold yet. */
export function AddRoleAction({ className, onOpen }: AddRoleActionProps) {
  const { user, addRole } = useAuth();
  const isOnline = useOnlineStatus();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = missingRole(user?.roles ?? []);
  if (!role) return null;

  const label = ROLE_LABELS[role];

  const close = () => {
    setIsOpen(false);
    setError(null);
  };

  const handleConfirm = async () => {
    setIsAdding(true);
    setError(null);
    try {
      await addRole(role);
      setIsOpen(false);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "The role could not be added. Check your connection and try again.",
      );
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          onOpen?.();
          setIsOpen(true);
        }}
        disabled={!isOnline}
        title={isOnline ? undefined : "Connect to the internet to add a role"}
        className={className}
      >
        Also use as {label}
      </button>

      <ConfirmDialog
        open={isOpen}
        title={`Add the ${label} role?`}
        confirmLabel={`Add ${label} role`}
        tone="primary"
        isConfirming={isAdding}
        onConfirm={handleConfirm}
        onCancel={close}
      >
        <p>
          You will also be able to {ROLE_DESCRIPTIONS[role]}, using this same
          account.
        </p>
        <p>A role cannot be removed once it is added.</p>
        {error && <p className="text-error-700">{error}</p>}
      </ConfirmDialog>
    </>
  );
}
