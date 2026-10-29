import { Link } from 'react-router-dom';
import { useOutbox } from '../../hooks/useOutbox';

/** Header link showing how many records on this device still need syncing. */
export function SyncStatusIndicator() {
  const { unsyncedCount, needsAttentionCount } = useOutbox();

  if (unsyncedCount === 0) {
    return null;
  }

  const label =
    needsAttentionCount > 0
      ? `${needsAttentionCount} need${needsAttentionCount === 1 ? 's' : ''} attention`
      : `${unsyncedCount} waiting to sync`;

  return (
    <Link
      to="/sync"
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
        needsAttentionCount > 0
          ? 'bg-error-50 text-error-700'
          : 'bg-warning-50 text-warning-600'
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${
          needsAttentionCount > 0 ? 'bg-error-600' : 'bg-warning-600'
        }`}
      />
      {label}
    </Link>
  );
}
