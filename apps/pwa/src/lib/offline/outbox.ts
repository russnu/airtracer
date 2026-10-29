import type { CreateServiceRecordPayload } from '../../types/api';
import { requestToPromise, runTransaction, STORES } from './db';

/**
 * Service records waiting to be sent to the API. Every record is written here
 * before any network call, so nothing typed is lost if the request fails.
 *
 * - `pending`: waiting to be sent (`nextAttemptAt` schedules retries).
 * - `syncing`: claimed by a sync run until `leaseUntil`; an expired lease means
 *   the tab stopped mid-request, and the item can be claimed again.
 * - `synced`: stored by the API; kept briefly so the user can see it went.
 * - `needs_attention`: the API rejected it; never retried or deleted
 *   automatically.
 */
export type OutboxStatus = 'pending' | 'syncing' | 'synced' | 'needs_attention';

export type OutboxPayload = Omit<
  CreateServiceRecordPayload,
  'clientRequestId' | 'clientCapturedAt'
>;

export interface OutboxError {
  statusCode: number | null;
  message: string;
}

export interface OutboxItem {
  clientRequestId: string;
  /** Device-wide save order, assigned when the item is first saved. */
  sequence: number;
  payloadVersion: 1;
  userId: string;
  assetId: string;
  assetLabel: string | null;
  payload: OutboxPayload;
  clientCapturedAt: string;
  status: OutboxStatus;
  attempts: number;
  nextAttemptAt: number;
  leaseUntil: number | null;
  lastError: OutboxError | null;
  serverRecordId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const UNSYNCED_STATUSES: OutboxStatus[] = [
  'pending',
  'syncing',
  'needs_attention',
];

const SYNC_LEASE_MS = 60_000;
const BASE_RETRY_MS = 5_000;
const MAX_RETRY_MS = 15 * 60_000;

// ----- Change notifications (this tab and other tabs) -----

const CHANNEL_NAME = 'airtracer-outbox';
const localChanges = new EventTarget();
const channel =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);

function notifyChange(): void {
  localChanges.dispatchEvent(new Event('change'));
  channel?.postMessage('change');
}

/** Calls `onChange` whenever the outbox changes in this or another tab. */
export function subscribeOutbox(onChange: () => void): () => void {
  const handleMessage = () => onChange();
  localChanges.addEventListener('change', onChange);
  channel?.addEventListener('message', handleMessage);
  return () => {
    localChanges.removeEventListener('change', onChange);
    channel?.removeEventListener('message', handleMessage);
  };
}

function bySaveOrder(a: OutboxItem, b: OutboxItem): number {
  return a.sequence - b.sequence;
}

// ----- Reads -----

export function getOutboxItem(clientRequestId: string): Promise<OutboxItem | null> {
  return runTransaction(STORES.outbox, 'readonly', async (tx) => {
    const item = await requestToPromise<OutboxItem | undefined>(
      tx.objectStore(STORES.outbox).get(clientRequestId),
    );
    return item ?? null;
  });
}

/** This user's items, oldest first. */
export function listOutbox(userId: string): Promise<OutboxItem[]> {
  return runTransaction(STORES.outbox, 'readonly', async (tx) => {
    const items = await requestToPromise<OutboxItem[]>(
      tx.objectStore(STORES.outbox).index('byUserId').getAll(userId),
    );
    return items.sort(bySaveOrder);
  });
}

export interface DeviceOutboxCounts {
  /** Unsynced items belonging to `userId`. */
  own: number;
  /** Unsynced items belonging to other accounts on this device. */
  otherAccounts: number;
}

/** Counts only, so another account's records are never shown. */
export function countUnsynced(userId: string | null): Promise<DeviceOutboxCounts> {
  return runTransaction(STORES.outbox, 'readonly', async (tx) => {
    const items = await requestToPromise<OutboxItem[]>(
      tx.objectStore(STORES.outbox).getAll(),
    );
    const counts: DeviceOutboxCounts = { own: 0, otherAccounts: 0 };
    for (const item of items) {
      if (!UNSYNCED_STATUSES.includes(item.status)) continue;
      if (item.userId === userId) {
        counts.own += 1;
      } else {
        counts.otherAccounts += 1;
      }
    }
    return counts;
  });
}

// ----- Writes -----

export interface EnqueueInput {
  clientRequestId: string;
  userId: string;
  assetId: string;
  assetLabel: string | null;
  payload: OutboxPayload;
}

/**
 * Saves a service record to the outbox. Re-saving the same `clientRequestId`
 * (the user retries the same form) replaces the payload, unless the record has
 * already been synced, in which case the synced item is returned unchanged.
 */
export async function enqueueServiceRecord(input: EnqueueInput): Promise<OutboxItem> {
  const result = await runTransaction(STORES.outbox, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.outbox);
    const existing = await requestToPromise<OutboxItem | undefined>(
      store.get(input.clientRequestId),
    );

    if (existing?.status === 'synced') {
      return existing;
    }
    if (existing && existing.userId !== input.userId) {
      throw new Error('This record belongs to another account.');
    }

    // Next sequence number, read in the same transaction so concurrent saves
    // in other tabs cannot take the same number.
    let sequence = existing?.sequence;
    if (sequence === undefined) {
      const last = await requestToPromise(
        store.index('bySequence').openCursor(null, 'prev'),
      );
      sequence = last ? (last.value as OutboxItem).sequence + 1 : 1;
    }

    const now = new Date().toISOString();
    const item: OutboxItem = {
      clientRequestId: input.clientRequestId,
      sequence,
      payloadVersion: 1,
      userId: input.userId,
      assetId: input.assetId,
      assetLabel: input.assetLabel,
      payload: input.payload,
      clientCapturedAt: existing?.clientCapturedAt ?? now,
      status: 'pending',
      attempts: 0,
      nextAttemptAt: 0,
      leaseUntil: null,
      lastError: null,
      serverRecordId: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    store.put(item);
    return item;
  });
  notifyChange();
  return result;
}

/**
 * Atomically claims this user's oldest item that is due, marking it `syncing`
 * with a lease. Returns null when nothing is due.
 */
export async function claimNextDue(
  userId: string,
  now = Date.now(),
): Promise<OutboxItem | null> {
  const claimed = await runTransaction(STORES.outbox, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.outbox);
    const items = await requestToPromise<OutboxItem[]>(
      store.index('byUserId').getAll(userId),
    );
    const due = items
      .filter(
        (item) =>
          (item.status === 'pending' && item.nextAttemptAt <= now) ||
          (item.status === 'syncing' && (item.leaseUntil ?? 0) < now),
      )
      .sort(bySaveOrder)[0];

    if (!due) {
      return null;
    }

    const next: OutboxItem = {
      ...due,
      status: 'syncing',
      leaseUntil: now + SYNC_LEASE_MS,
      updatedAt: new Date(now).toISOString(),
    };
    store.put(next);
    return next;
  });
  if (claimed) notifyChange();
  return claimed;
}

/** Applies `change` to an item if it is still in one of `fromStatuses`. */
async function transition(
  clientRequestId: string,
  fromStatuses: OutboxStatus[],
  change: (item: OutboxItem) => OutboxItem,
): Promise<OutboxItem | null> {
  const updated = await runTransaction(STORES.outbox, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.outbox);
    const item = await requestToPromise<OutboxItem | undefined>(
      store.get(clientRequestId),
    );
    if (!item || !fromStatuses.includes(item.status)) {
      return null;
    }
    const next = { ...change(item), updatedAt: new Date().toISOString() };
    store.put(next);
    return next;
  });
  if (updated) notifyChange();
  return updated;
}

export function markSynced(clientRequestId: string, serverRecordId: string) {
  return transition(clientRequestId, ['syncing', 'pending'], (item) => ({
    ...item,
    status: 'synced',
    leaseUntil: null,
    lastError: null,
    serverRecordId,
  }));
}

export function retryDelayMs(attempts: number): number {
  const delay = Math.min(BASE_RETRY_MS * 2 ** attempts, MAX_RETRY_MS);
  // ±20% jitter so several devices do not retry in lockstep.
  return Math.round(delay * (0.8 + Math.random() * 0.4));
}

/** Schedules another attempt after a temporary failure. */
export function markForRetry(clientRequestId: string, error: OutboxError) {
  return transition(clientRequestId, ['syncing'], (item) => ({
    ...item,
    status: 'pending',
    attempts: item.attempts + 1,
    nextAttemptAt: Date.now() + retryDelayMs(item.attempts),
    leaseUntil: null,
    lastError: error,
  }));
}

/** Returns a claimed item to the queue without counting an attempt. */
export function releaseClaim(clientRequestId: string) {
  return transition(clientRequestId, ['syncing'], (item) => ({
    ...item,
    status: 'pending',
    leaseUntil: null,
  }));
}

export function markNeedsAttention(clientRequestId: string, error: OutboxError) {
  return transition(clientRequestId, ['syncing'], (item) => ({
    ...item,
    status: 'needs_attention',
    attempts: item.attempts + 1,
    leaseUntil: null,
    lastError: error,
  }));
}

/** Makes waiting items due now (the user pressed "Sync now"). */
export async function makeDueNow(userId: string): Promise<void> {
  await runTransaction(STORES.outbox, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.outbox);
    const items = await requestToPromise<OutboxItem[]>(
      store.index('byUserStatus').getAll([userId, 'pending']),
    );
    for (const item of items) {
      store.put({ ...item, nextAttemptAt: 0 });
    }
  });
  notifyChange();
}

/** Permanently removes an item the user chose to discard. */
export async function discardOutboxItem(clientRequestId: string): Promise<void> {
  await runTransaction(STORES.outbox, 'readwrite', (tx) => {
    tx.objectStore(STORES.outbox).delete(clientRequestId);
  });
  notifyChange();
}

/** Removes every unsynced item for this user (explicit discard on logout). */
export async function discardUnsyncedForUser(userId: string): Promise<void> {
  await runTransaction(STORES.outbox, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.outbox);
    const items = await requestToPromise<OutboxItem[]>(
      store.index('byUserId').getAll(userId),
    );
    for (const item of items) {
      if (UNSYNCED_STATUSES.includes(item.status)) {
        store.delete(item.clientRequestId);
      }
    }
  });
  notifyChange();
}

/** Deletes synced items older than `maxAgeMs`. */
export async function pruneSynced(maxAgeMs: number, now = Date.now()): Promise<void> {
  const cutoff = new Date(now - maxAgeMs).toISOString();
  await runTransaction(STORES.outbox, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.outbox);
    const items = await requestToPromise<OutboxItem[]>(store.getAll());
    for (const item of items) {
      if (item.status === 'synced' && item.updatedAt < cutoff) {
        store.delete(item.clientRequestId);
      }
    }
  });
}
