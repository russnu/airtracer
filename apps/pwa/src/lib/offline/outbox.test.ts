import { describe, expect, it } from 'vitest';
import {
  claimNextDue,
  countUnsynced,
  discardUnsyncedForUser,
  enqueueServiceRecord,
  getOutboxItem,
  listOutbox,
  makeDueNow,
  markForRetry,
  markNeedsAttention,
  markSynced,
  pruneSynced,
  releaseClaim,
  retryDelayMs,
} from './outbox';
import type { EnqueueInput } from './outbox';

function input(overrides: Partial<EnqueueInput> = {}): EnqueueInput {
  return {
    clientRequestId: crypto.randomUUID(),
    userId: 'tech-1',
    assetId: 'asset-1',
    assetLabel: 'Daikin FTKF35',
    payload: {
      serviceDate: '2026-10-20T00:00:00.000Z',
      serviceType: 'Preventive Maintenance',
      suctionPressure: 70,
    },
    ...overrides,
  };
}

describe('outbox', () => {
  it('stores a new record as pending and due immediately', async () => {
    const item = await enqueueServiceRecord(input());

    expect(item.status).toBe('pending');
    expect(item.attempts).toBe(0);
    expect(await getOutboxItem(item.clientRequestId)).toEqual(item);
  });

  it('replaces the payload when the same form is saved again', async () => {
    const first = await enqueueServiceRecord(input());
    const second = await enqueueServiceRecord({
      ...input({ clientRequestId: first.clientRequestId }),
      payload: { ...first.payload, findings: 'Corrected' },
    });

    expect(second.payload.findings).toBe('Corrected');
    expect(second.createdAt).toBe(first.createdAt);
    expect(await listOutbox('tech-1')).toHaveLength(1);
  });

  it('never overwrites a record that has already synced', async () => {
    const item = await enqueueServiceRecord(input());
    await claimNextDue('tech-1');
    await markSynced(item.clientRequestId, 'server-1');

    const again = await enqueueServiceRecord(
      input({ clientRequestId: item.clientRequestId }),
    );

    expect(again.status).toBe('synced');
    expect(again.serverRecordId).toBe('server-1');
  });

  it('claims the oldest due item for that user only', async () => {
    const own = await enqueueServiceRecord(input());
    await enqueueServiceRecord(input({ userId: 'tech-2' }));
    await enqueueServiceRecord(input());

    const claimed = await claimNextDue('tech-1');

    expect(claimed?.clientRequestId).toBe(own.clientRequestId);
    expect(claimed?.status).toBe('syncing');
    expect(claimed?.leaseUntil).toBeGreaterThan(Date.now());
  });

  it('does not hand the same item to two claimers', async () => {
    await enqueueServiceRecord(input());

    const [a, b] = await Promise.all([
      claimNextDue('tech-1'),
      claimNextDue('tech-1'),
    ]);

    expect([a, b].filter(Boolean)).toHaveLength(1);
  });

  it('reclaims an item whose lease expired (tab stopped mid-sync)', async () => {
    const item = await enqueueServiceRecord(input());
    await claimNextDue('tech-1');

    expect(await claimNextDue('tech-1')).toBeNull();
    const reclaimed = await claimNextDue('tech-1', Date.now() + 61_000);
    expect(reclaimed?.clientRequestId).toBe(item.clientRequestId);
  });

  it('schedules a retry with backoff after a temporary failure', async () => {
    const item = await enqueueServiceRecord(input());
    await claimNextDue('tech-1');

    const retried = await markForRetry(item.clientRequestId, {
      statusCode: null,
      message: 'offline',
    });

    expect(retried?.status).toBe('pending');
    expect(retried?.attempts).toBe(1);
    expect(retried?.nextAttemptAt).toBeGreaterThan(Date.now());
    expect(await claimNextDue('tech-1')).toBeNull();

    await makeDueNow('tech-1');
    expect(await claimNextDue('tech-1')).not.toBeNull();
  });

  it('caps the retry delay at 15 minutes', () => {
    expect(retryDelayMs(0)).toBeLessThanOrEqual(6_000);
    expect(retryDelayMs(30)).toBeLessThanOrEqual(15 * 60_000 * 1.2);
  });

  it('keeps rejected items and never claims them again', async () => {
    const item = await enqueueServiceRecord(input());
    await claimNextDue('tech-1');
    await markNeedsAttention(item.clientRequestId, {
      statusCode: 400,
      message: 'Cannot create a service record for an inactive asset.',
    });

    expect(await claimNextDue('tech-1', Date.now() + 3_600_000)).toBeNull();
    expect((await getOutboxItem(item.clientRequestId))?.status).toBe(
      'needs_attention',
    );
  });

  it('returns a claim without counting an attempt', async () => {
    const item = await enqueueServiceRecord(input());
    await claimNextDue('tech-1');
    const released = await releaseClaim(item.clientRequestId);

    expect(released?.status).toBe('pending');
    expect(released?.attempts).toBe(0);
  });

  it('counts other accounts separately without exposing them', async () => {
    await enqueueServiceRecord(input());
    await enqueueServiceRecord(input({ userId: 'tech-2' }));
    await enqueueServiceRecord(input({ userId: 'tech-3' }));

    expect(await countUnsynced('tech-1')).toEqual({ own: 1, otherAccounts: 2 });
    expect(await countUnsynced(null)).toEqual({ own: 0, otherAccounts: 3 });
  });

  it("discards only that user's unsynced items", async () => {
    const synced = await enqueueServiceRecord(input());
    await claimNextDue('tech-1');
    await markSynced(synced.clientRequestId, 'server-1');
    await enqueueServiceRecord(input());
    await enqueueServiceRecord(input({ userId: 'tech-2' }));

    await discardUnsyncedForUser('tech-1');

    expect(await listOutbox('tech-1')).toEqual([
      expect.objectContaining({ status: 'synced' }),
    ]);
    expect(await listOutbox('tech-2')).toHaveLength(1);
  });

  it('prunes old synced items only', async () => {
    const item = await enqueueServiceRecord(input());
    await claimNextDue('tech-1');
    await markSynced(item.clientRequestId, 'server-1');
    await enqueueServiceRecord(input());

    await pruneSynced(1_000, Date.now() + 10_000);

    const remaining = await listOutbox('tech-1');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].status).toBe('pending');
  });
});
