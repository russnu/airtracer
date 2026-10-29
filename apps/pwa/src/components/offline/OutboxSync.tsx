import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOutboxSubscription, useSyncNow } from '../../hooks/useOutbox';
import { pruneSynced } from '../../lib/offline/outbox';

const SYNC_INTERVAL_MS = 60_000;
const KEEP_SYNCED_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Runs outbox sync in the background while a user is signed in: on sign-in,
 * when the connection returns, when the app becomes visible, and every
 * minute. Renders nothing.
 */
export function OutboxSync() {
  const { user, isLoading } = useAuth();
  const userId = user?.id ?? null;
  const syncNow = useSyncNow();
  useOutboxSubscription();

  useEffect(() => {
    if (isLoading || !userId) return;

    let running = false;
    const trigger = () => {
      if (running || !navigator.onLine) return;
      running = true;
      syncNow()
        .catch((error) => {
          console.warn('AirTracer: background sync failed.', error);
        })
        .finally(() => {
          running = false;
        });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') trigger();
    };

    pruneSynced(KEEP_SYNCED_MS).catch((error) => {
      console.warn('AirTracer: could not prune synced records.', error);
    });
    trigger();

    window.addEventListener('online', trigger);
    document.addEventListener('visibilitychange', onVisibilityChange);
    const interval = window.setInterval(trigger, SYNC_INTERVAL_MS);

    return () => {
      window.removeEventListener('online', trigger);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.clearInterval(interval);
    };
  }, [isLoading, userId, syncNow]);

  return null;
}
