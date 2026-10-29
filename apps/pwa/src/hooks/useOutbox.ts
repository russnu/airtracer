import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import {
  countUnsynced,
  listOutbox,
  makeDueNow,
  subscribeOutbox,
  UNSYNCED_STATUSES,
} from '../lib/offline/outbox';
import { syncOutbox } from '../lib/offline/sync';
import type { SyncResult } from '../lib/offline/sync';

const OUTBOX_KEY = ['outbox'] as const;

/** Keeps outbox queries fresh when this or another tab changes the outbox. */
export function useOutboxSubscription(): void {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      subscribeOutbox(() => {
        queryClient.invalidateQueries({ queryKey: OUTBOX_KEY });
      }),
    [queryClient],
  );
}

/** The signed-in user's outbox items, oldest first. */
export function useOutbox() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const query = useQuery({
    queryKey: [...OUTBOX_KEY, 'items', userId],
    queryFn: () => listOutbox(userId!),
    enabled: !!userId,
    networkMode: 'always',
  });

  const items = query.data ?? [];
  const unsynced = items.filter((item) => UNSYNCED_STATUSES.includes(item.status));

  return {
    items,
    unsyncedCount: unsynced.length,
    needsAttentionCount: items.filter((item) => item.status === 'needs_attention')
      .length,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/** Unsynced counts for this device; other accounts appear as a number only. */
export function useDeviceOutboxCounts() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: [...OUTBOX_KEY, 'counts', userId],
    queryFn: () => countUnsynced(userId),
    networkMode: 'always',
  });
}

/**
 * Returns a function that syncs the user's outbox now, refreshes server data
 * when records were stored, and ends the session if the token was rejected.
 */
export function useSyncNow() {
  const { user, handleUnauthorized } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  return useCallback(
    async (options: { force?: boolean } = {}): Promise<SyncResult | null> => {
      if (!userId) return null;

      if (options.force) {
        await makeDueNow(userId);
      }
      const result = await syncOutbox(userId);

      if (result.syncedIds.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['passport'] });
        queryClient.invalidateQueries({ queryKey: ['service-records'] });
        queryClient.invalidateQueries({ queryKey: ['assets'] });
      }
      if (result.authRequired) {
        await handleUnauthorized();
      }
      return result;
    },
    [userId, queryClient, handleUnauthorized],
  );
}
