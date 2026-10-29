import { ApiClientError, qrApi } from '../api-client';
import type {
  PublicAsset,
  PublicPassportResponse,
  PublicServiceRecord,
} from '../../types/api';
import { requestToPromise, runTransaction, STORES } from './db';

/**
 * Saved copies are text only: photo URLs are short-lived signed links, so only
 * the number of photos is kept.
 */
export type SavedServiceRecord = Omit<PublicServiceRecord, 'photos'> & {
  photoCount: number;
};

export interface SavedPassport {
  assetId: string;
  token: string;
  asset: PublicAsset;
  serviceHistory: SavedServiceRecord[];
  savedByUserId: string;
  savedAt: string;
  refreshedAt: string;
  schemaVersion: 1;
}

/** HTTP statuses meaning the QR token no longer resolves to a passport. */
export function isRevokedStatus(statusCode: number): boolean {
  return statusCode === 404 || statusCode === 409;
}

function toSavedHistory(data: PublicPassportResponse): SavedServiceRecord[] {
  return data.serviceHistory.map(({ photos, ...record }) => ({
    ...record,
    photoCount: photos.length,
  }));
}

export function getSavedPassportByToken(
  token: string,
  userId: string,
): Promise<SavedPassport | null> {
  return runTransaction(STORES.savedPassports, 'readonly', async (tx) => {
    const saved = await requestToPromise<SavedPassport | undefined>(
      tx.objectStore(STORES.savedPassports).index('byToken').get(token),
    );
    return saved && saved.savedByUserId === userId ? saved : null;
  });
}

export function getSavedPassportByAssetId(
  assetId: string,
  userId: string,
): Promise<SavedPassport | null> {
  return runTransaction(STORES.savedPassports, 'readonly', async (tx) => {
    const saved = await requestToPromise<SavedPassport | undefined>(
      tx.objectStore(STORES.savedPassports).get(assetId),
    );
    return saved && saved.savedByUserId === userId ? saved : null;
  });
}

export function listSavedPassports(userId: string): Promise<SavedPassport[]> {
  return runTransaction(STORES.savedPassports, 'readonly', async (tx) => {
    const saved = await requestToPromise<SavedPassport[]>(
      tx.objectStore(STORES.savedPassports).index('byUserId').getAll(userId),
    );
    return saved.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  });
}

/**
 * Saves (or replaces) the copy for this asset. Keyed by asset ID, so saving
 * after the QR code was regenerated replaces the copy under the old token.
 */
export function savePassport(
  token: string,
  data: PublicPassportResponse,
  userId: string,
): Promise<SavedPassport> {
  const now = new Date().toISOString();
  const saved: SavedPassport = {
    assetId: data.asset.id,
    token,
    asset: data.asset,
    serviceHistory: toSavedHistory(data),
    savedByUserId: userId,
    savedAt: now,
    refreshedAt: now,
    schemaVersion: 1,
  };
  return runTransaction(STORES.savedPassports, 'readwrite', (tx) => {
    tx.objectStore(STORES.savedPassports).put(saved);
    return saved;
  });
}

/**
 * Updates an existing copy with fresh data. Does nothing if this user has not
 * saved the asset. Returns the updated copy, or null.
 */
export function updateSavedPassport(
  token: string,
  data: PublicPassportResponse,
  userId: string,
): Promise<SavedPassport | null> {
  return runTransaction(STORES.savedPassports, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.savedPassports);
    const existing = await requestToPromise<SavedPassport | undefined>(
      store.get(data.asset.id),
    );
    if (!existing || existing.savedByUserId !== userId) {
      return null;
    }
    const updated: SavedPassport = {
      ...existing,
      token,
      asset: data.asset,
      serviceHistory: toSavedHistory(data),
      refreshedAt: new Date().toISOString(),
    };
    store.put(updated);
    return updated;
  });
}

export function removeSavedPassport(assetId: string): Promise<void> {
  return runTransaction(STORES.savedPassports, 'readwrite', (tx) => {
    tx.objectStore(STORES.savedPassports).delete(assetId);
  });
}

/** Removes the copy saved under `token`, if any. Returns whether one existed. */
export function removeSavedPassportByToken(token: string): Promise<boolean> {
  return runTransaction(STORES.savedPassports, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.savedPassports);
    const assetId = await requestToPromise<IDBValidKey | undefined>(
      store.index('byToken').getKey(token),
    );
    if (assetId === undefined) {
      return false;
    }
    store.delete(assetId);
    return true;
  });
}

async function deleteWhere(
  predicate: (saved: SavedPassport) => boolean,
): Promise<void> {
  await runTransaction(STORES.savedPassports, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.savedPassports);
    const all = await requestToPromise<SavedPassport[]>(store.getAll());
    for (const saved of all) {
      if (predicate(saved)) {
        store.delete(saved.assetId);
      }
    }
  });
}

export function removeSavedPassportsForUser(userId: string): Promise<void> {
  return deleteWhere((saved) => saved.savedByUserId === userId);
}

/** Used on sign-in: copies left by another account are removed. */
export function removeSavedPassportsNotOwnedBy(userId: string): Promise<void> {
  return deleteWhere((saved) => saved.savedByUserId !== userId);
}

export function savedToPublicHistory(
  history: SavedServiceRecord[],
): PublicServiceRecord[] {
  return history.map((record) => ({
    id: record.id,
    serviceDate: record.serviceDate,
    serviceType: record.serviceType,
    description: record.description,
    measurements: record.measurements,
    findings: record.findings,
    recommendations: record.recommendations,
    technician: record.technician,
    photos: [],
  }));
}

/** The QR token no longer resolves (404 not found, 409 inactive). */
export class PassportUnavailableError extends Error {
  readonly statusCode: number;
  /** A saved copy for this token existed and was deleted. */
  readonly removedOfflineCopy: boolean;

  constructor(cause: ApiClientError, removedOfflineCopy: boolean) {
    super(cause.message, { cause });
    this.name = 'PassportUnavailableError';
    this.statusCode = cause.statusCode;
    this.removedOfflineCopy = removedOfflineCopy;
  }
}

export interface PassportView {
  data: PublicPassportResponse;
  /** `saved`: the API was unreachable and the offline copy is shown. */
  source: 'network' | 'saved';
  saved: SavedPassport | null;
  /** Photo counts for a saved copy, keyed by service record ID. */
  photoCounts: Record<string, number>;
}

async function tryIdb<T>(work: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await work();
  } catch (error) {
    console.warn('AirTracer: offline passport storage is unavailable.', error);
    return fallback;
  }
}

/**
 * Loads a passport from the API, keeping any saved copy up to date. If the API
 * is unreachable (or failing), falls back to this user's saved copy. A revoked
 * or regenerated QR code deletes the saved copy.
 */
export async function loadPassport(
  token: string,
  userId: string | null,
): Promise<PassportView> {
  try {
    const data = await qrApi.getPublicPassport(token);
    const saved = userId
      ? await tryIdb(() => updateSavedPassport(token, data, userId), null)
      : null;
    return { data, source: 'network', saved, photoCounts: {} };
  } catch (error) {
    if (error instanceof ApiClientError && isRevokedStatus(error.statusCode)) {
      const removed = await tryIdb(() => removeSavedPassportByToken(token), false);
      throw new PassportUnavailableError(error, removed);
    }

    const serverUnavailable =
      !(error instanceof ApiClientError) || error.statusCode >= 500;
    if (userId && serverUnavailable) {
      const saved = await tryIdb(() => getSavedPassportByToken(token, userId), null);
      if (saved) {
        return {
          data: {
            asset: saved.asset,
            serviceHistory: savedToPublicHistory(saved.serviceHistory),
          },
          source: 'saved',
          saved,
          photoCounts: Object.fromEntries(
            saved.serviceHistory.map((record) => [record.id, record.photoCount]),
          ),
        };
      }
    }
    throw error;
  }
}

export interface RefreshResult {
  refreshed: number;
  /** Copies deleted because their QR code was revoked or regenerated. */
  removed: SavedPassport[];
  /** Copies kept unchanged because the server could not be reached. */
  failed: number;
}

const REFRESH_CONCURRENCY = 3;
let refreshInFlight: Promise<RefreshResult> | null = null;

/**
 * Refetches every saved copy for this user. A 404 or 409 means the QR code was
 * revoked or regenerated, so the copy is deleted; any other failure keeps it.
 */
export function refreshSavedPassports(userId: string): Promise<RefreshResult> {
  if (!refreshInFlight) {
    refreshInFlight = runRefresh(userId).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function runRefresh(userId: string): Promise<RefreshResult> {
  const saved = await listSavedPassports(userId);
  const result: RefreshResult = { refreshed: 0, removed: [], failed: 0 };
  const queue = [...saved];

  async function worker() {
    for (let next = queue.shift(); next; next = queue.shift()) {
      try {
        const data = await qrApi.getPublicPassport(next.token);
        await updateSavedPassport(next.token, data, userId);
        result.refreshed += 1;
      } catch (error) {
        if (error instanceof ApiClientError && isRevokedStatus(error.statusCode)) {
          await removeSavedPassport(next.assetId);
          result.removed.push(next);
        } else {
          result.failed += 1;
        }
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(REFRESH_CONCURRENCY, queue.length) }, worker),
  );
  return result;
}
