import 'fake-indexeddb/auto';
import { afterEach, beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { closeDb } from '../lib/offline/db';

// Cross-tab notifications are not needed in unit tests, and an open
// BroadcastChannel would keep the Node worker alive.
vi.stubGlobal('BroadcastChannel', undefined);

beforeEach(() => {
  // A fresh, empty database for every test.
  globalThis.indexedDB = new IDBFactory();
});

afterEach(async () => {
  await closeDb();
  vi.restoreAllMocks();
});
