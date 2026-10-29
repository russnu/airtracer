import type { UserResponse } from '../../types/api';
import { requestToPromise, runTransaction, STORES } from './db';

const SESSION_KEY = 'session';

/**
 * The last user profile confirmed by `/auth/me`, so the app can render for that
 * user while offline. It grants nothing: the API still checks the token.
 */
export interface SessionSnapshot {
  key: typeof SESSION_KEY;
  userId: string;
  user: UserResponse;
  cachedAt: string;
}

export function readSession(): Promise<SessionSnapshot | null> {
  return runTransaction(STORES.meta, 'readonly', async (tx) => {
    const snapshot = await requestToPromise<SessionSnapshot | undefined>(
      tx.objectStore(STORES.meta).get(SESSION_KEY),
    );
    return snapshot ?? null;
  });
}

export function writeSession(user: UserResponse): Promise<void> {
  const snapshot: SessionSnapshot = {
    key: SESSION_KEY,
    userId: user.id,
    user,
    cachedAt: new Date().toISOString(),
  };
  return runTransaction(STORES.meta, 'readwrite', (tx) => {
    tx.objectStore(STORES.meta).put(snapshot);
  });
}

export function clearSession(): Promise<void> {
  return runTransaction(STORES.meta, 'readwrite', (tx) => {
    tx.objectStore(STORES.meta).delete(SESSION_KEY);
  });
}
