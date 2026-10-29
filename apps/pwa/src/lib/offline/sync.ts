import { ApiClientError, isNetworkError, serviceRecordsApi } from '../api-client';
import {
  claimNextDue,
  markForRetry,
  markNeedsAttention,
  markSynced,
  releaseClaim,
} from './outbox';
import type { OutboxItem } from './outbox';

const REQUEST_TIMEOUT_MS = 20_000;
const SYNC_LOCK_NAME = 'airtracer-outbox-sync';

export interface SyncResult {
  /** Another tab is already syncing; nothing was sent from this one. */
  skipped: boolean;
  syncedIds: string[];
  needsAttentionIds: string[];
  /** The API rejected the token; the user must sign in again. */
  authRequired: boolean;
  /** The API could not be reached or is failing; remaining items wait. */
  interrupted: boolean;
}

function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

type Outcome = 'synced' | 'needs_attention' | 'retry' | 'auth_required';

async function send(item: OutboxItem): Promise<Outcome> {
  try {
    const record = await serviceRecordsApi.create(
      item.assetId,
      {
        ...item.payload,
        clientRequestId: item.clientRequestId,
        clientCapturedAt: item.clientCapturedAt,
      },
      timeoutSignal(REQUEST_TIMEOUT_MS),
    );
    await markSynced(item.clientRequestId, record.id);
    return 'synced';
  } catch (error) {
    if (isNetworkError(error)) {
      await markForRetry(item.clientRequestId, {
        statusCode: null,
        message: 'The server could not be reached.',
      });
      return 'retry';
    }

    if (error instanceof ApiClientError) {
      if (error.statusCode === 401) {
        await releaseClaim(item.clientRequestId);
        return 'auth_required';
      }
      if (error.statusCode === 429 || error.statusCode >= 500) {
        await markForRetry(item.clientRequestId, {
          statusCode: error.statusCode,
          message: 'The server is temporarily unavailable.',
        });
        return 'retry';
      }
      // 400, 403, 404, 409 and other client errors: retrying cannot succeed.
      await markNeedsAttention(item.clientRequestId, {
        statusCode: error.statusCode,
        message: error.message,
      });
      return 'needs_attention';
    }

    // Unexpected client-side failure: keep the item and retry later.
    console.error('AirTracer: unexpected error while syncing a record.', error);
    await markForRetry(item.clientRequestId, {
      statusCode: null,
      message: 'An unexpected error occurred.',
    });
    return 'retry';
  }
}

async function runSync(userId: string): Promise<SyncResult> {
  const result: SyncResult = {
    skipped: false,
    syncedIds: [],
    needsAttentionIds: [],
    authRequired: false,
    interrupted: false,
  };

  // One item at a time, oldest first. Each item is claimed atomically, so a
  // tab without the Web Locks API cannot send the same item concurrently, and
  // the server's idempotency key covers any remaining overlap.
  for (let item = await claimNextDue(userId); item; item = await claimNextDue(userId)) {
    const outcome = await send(item);

    if (outcome === 'synced') {
      result.syncedIds.push(item.clientRequestId);
    } else if (outcome === 'needs_attention') {
      result.needsAttentionIds.push(item.clientRequestId);
    } else if (outcome === 'auth_required') {
      result.authRequired = true;
      break;
    } else {
      // The server is unreachable or failing: stop and wait for the backoff.
      result.interrupted = true;
      break;
    }
  }

  return result;
}

/**
 * Sends this user's due outbox items. Only one tab syncs at a time; other
 * tabs return `skipped`. Items belonging to other accounts are never sent.
 */
export async function syncOutbox(userId: string): Promise<SyncResult> {
  if (!navigator.locks?.request) {
    return runSync(userId);
  }

  return navigator.locks.request(
    SYNC_LOCK_NAME,
    { ifAvailable: true },
    async (lock): Promise<SyncResult> => {
      if (!lock) {
        return {
          skipped: true,
          syncedIds: [],
          needsAttentionIds: [],
          authRequired: false,
          interrupted: false,
        };
      }
      return runSync(userId);
    },
  );
}
