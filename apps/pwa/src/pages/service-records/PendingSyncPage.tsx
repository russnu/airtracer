import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useDeviceOutboxCounts,
  useOutbox,
  useSyncNow,
} from '../../hooks/useOutbox';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { discardOutboxItem } from '../../lib/offline/outbox';
import type { OutboxItem, OutboxStatus } from '../../lib/offline/outbox';
import type { SyncResult } from '../../lib/offline/sync';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';

const STATUS_LABELS: Record<
  OutboxStatus,
  { label: string; variant: 'warning' | 'info' | 'success' | 'error' }
> = {
  pending: { label: 'Waiting to sync', variant: 'warning' },
  syncing: { label: 'Syncing', variant: 'info' },
  synced: { label: 'Synced', variant: 'success' },
  needs_attention: { label: 'Needs attention', variant: 'error' },
};

function describeSyncResult(result: SyncResult | null): string | null {
  if (!result) return null;
  if (result.skipped) return 'Another AirTracer tab is already syncing.';
  if (result.authRequired) return 'Sign in again to sync your records.';
  if (result.interrupted) {
    return 'The server could not be reached. Records will retry automatically.';
  }
  return null;
}

export function PendingSyncPage() {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const syncNow = useSyncNow();
  const { items, isLoading, error } = useOutbox();
  const { data: deviceCounts } = useDeviceOutboxCounts();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [toDiscard, setToDiscard] = useState<OutboxItem | null>(null);
  const [discardError, setDiscardError] = useState<string | null>(null);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      setSyncMessage(describeSyncResult(await syncNow({ force: true })));
    } catch (err) {
      console.warn('AirTracer: manual sync failed.', err);
      setSyncMessage('Sync failed. Records will retry automatically.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDiscard = async () => {
    if (!toDiscard) return;
    try {
      await discardOutboxItem(toDiscard.clientRequestId);
      setToDiscard(null);
    } catch (err) {
      console.warn('AirTracer: discarding a record failed.', err);
      setDiscardError('The record could not be discarded.');
      setToDiscard(null);
    }
  };

  const hasUnsynced = items.some((item) => item.status !== 'synced');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Pending sync"
        description="Service records saved on this device and their upload status."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleSyncNow}
          isLoading={isSyncing}
          disabled={!isOnline || !hasUnsynced}
        >
          Sync now
        </Button>
        {!isOnline && (
          <span className="text-sm text-primary-500">
            You're offline. Records will sync when the connection returns.
          </span>
        )}
      </div>

      {syncMessage && (
        <Alert variant="warning" onDismiss={() => setSyncMessage(null)}>
          {syncMessage}
        </Alert>
      )}
      {discardError && (
        <Alert variant="error" onDismiss={() => setDiscardError(null)}>
          {discardError}
        </Alert>
      )}
      {deviceCounts && deviceCounts.otherAccounts > 0 && (
        <Alert variant="info">
          {deviceCounts.otherAccounts} record
          {deviceCounts.otherAccounts === 1 ? ' from another account is' : 's from another account are'}{' '}
          waiting on this device. They sync when that account signs in.
        </Alert>
      )}
      {error && (
        <Alert variant="error">
          Offline storage is unavailable in this browser, so records cannot be
          saved on this device.
        </Alert>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="Nothing waiting"
            description="Service records you save while offline appear here until they are uploaded."
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          {items
            .slice()
            .reverse()
            .map((item) => {
              const status = STATUS_LABELS[item.status];
              return (
                <li key={item.clientRequestId}>
                  <Card padding="sm" className="space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-primary-900">
                          {item.payload.serviceType}
                        </p>
                        <p className="text-sm text-primary-500">
                          {item.assetLabel ?? 'Unknown unit'} ·{' '}
                          {new Date(item.payload.serviceDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>

                    <p className="text-xs text-primary-400">
                      Saved {new Date(item.createdAt).toLocaleString()}
                      {item.attempts > 0 &&
                        ` · ${item.attempts} attempt${item.attempts === 1 ? '' : 's'}`}
                    </p>

                    {item.lastError && item.status !== 'synced' && (
                      <p
                        className={`text-sm ${
                          item.status === 'needs_attention'
                            ? 'text-error-700'
                            : 'text-primary-600'
                        }`}
                      >
                        {item.lastError.message}
                      </p>
                    )}

                    {item.status === 'needs_attention' && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={() =>
                            navigate(
                              `/equipment/${item.assetId}/service-records/new?retry=${encodeURIComponent(
                                item.clientRequestId,
                              )}`,
                            )
                          }
                        >
                          Edit &amp; retry
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setToDiscard(item)}
                        >
                          Discard
                        </Button>
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
        </ul>
      )}

      <ConfirmDialog
        open={toDiscard !== null}
        title="Discard this record?"
        confirmLabel="Discard record"
        confirmPhrase="DISCARD"
        onConfirm={handleDiscard}
        onCancel={() => setToDiscard(null)}
      >
        <p>
          The service record will be deleted from this device and will not be
          uploaded. This cannot be undone.
        </p>
      </ConfirmDialog>
    </div>
  );
}
