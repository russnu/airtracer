/**
 * Minimal promise helpers over the native IndexedDB API.
 *
 * Schema changes: bump DB_VERSION and add a new `if (oldVersion < N)` block to
 * `upgrade`. Never edit a block that has already been released; existing
 * devices skip it.
 */

export const DB_NAME = 'airtracer';
export const DB_VERSION = 1;

export const STORES = {
  meta: 'meta',
  savedPassports: 'savedPassports',
  outbox: 'outbox',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

/**
 * Fires `versionchange` when another tab upgrades the database (this tab's
 * connection is closed and the page should be reloaded), and `blocked` when
 * this tab's upgrade is waiting for other tabs to close.
 */
export const dbEvents = new EventTarget();

function upgrade(db: IDBDatabase, oldVersion: number): void {
  if (oldVersion < 1) {
    db.createObjectStore(STORES.meta, { keyPath: 'key' });

    const passports = db.createObjectStore(STORES.savedPassports, {
      keyPath: 'assetId',
    });
    passports.createIndex('byToken', 'token', { unique: true });
    passports.createIndex('byUserId', 'savedByUserId');

    const outbox = db.createObjectStore(STORES.outbox, {
      keyPath: 'clientRequestId',
    });
    outbox.createIndex('byUserId', 'userId');
    outbox.createIndex('byUserStatus', ['userId', 'status']);
    outbox.createIndex('byAssetId', 'assetId');
    // Save order; timestamps can tie when records are saved in the same ms.
    outbox.createIndex('bySequence', 'sequence', { unique: true });
  }
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      upgrade(request.result, event.oldVersion);
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
        dbEvents.dispatchEvent(new Event('versionchange'));
      };
      db.onclose = () => {
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open IndexedDB.'));
    };

    request.onblocked = () => {
      dbEvents.dispatchEvent(new Event('blocked'));
    };
  });

  dbPromise = opening;
  opening.catch(() => {
    dbPromise = null;
  });
  return opening;
}

/** Closes the cached connection. Used by tests. */
export async function closeDb(): Promise<void> {
  if (!dbPromise) {
    return;
  }
  const pending = dbPromise;
  dbPromise = null;
  try {
    (await pending).close();
  } catch {
    // The database never opened; nothing to close.
  }
}

/** True when IndexedDB can be opened (false in some private modes). */
export async function isIdbAvailable(): Promise<boolean> {
  try {
    await openDb();
    return true;
  } catch {
    return false;
  }
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Runs `work` inside one transaction and resolves only after the transaction
 * commits, so callers never treat an aborted write as saved.
 *
 * `work` may await IndexedDB requests, but must not await anything else
 * (network calls, timers): the transaction commits as soon as it has no
 * pending requests.
 */
export async function runTransaction<T>(
  storeNames: StoreName | StoreName[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction) => T | Promise<T>,
): Promise<T> {
  const db = await openDb();
  const tx = db.transaction(storeNames, mode);

  const completed = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () =>
      reject(tx.error ?? new DOMException('Transaction aborted.', 'AbortError'));
  });

  let result: T;
  try {
    result = await work(tx);
  } catch (error) {
    try {
      tx.abort();
    } catch {
      // The transaction already finished.
    }
    await completed.catch(() => undefined);
    throw error;
  }

  await completed;
  return result;
}

export function isQuotaExceededError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'QuotaExceededError';
}

/**
 * Asks the browser not to evict offline data under storage pressure. The
 * browser may decline; offline data still works, it is just evictable.
 */
export async function requestPersistentStorage(): Promise<void> {
  if (!navigator.storage?.persist) {
    return;
  }
  try {
    if (!(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch (error) {
    console.warn('AirTracer: persistent storage request failed.', error);
  }
}
