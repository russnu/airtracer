import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { ApiClientError, NetworkError, serviceRecordsApi } from '../api-client';
import type { ServiceRecord } from '../../types/api';
import { enqueueServiceRecord, getOutboxItem } from './outbox';
import type { EnqueueInput } from './outbox';
import { syncOutbox } from './sync';

function input(overrides: Partial<EnqueueInput> = {}): EnqueueInput {
  return {
    clientRequestId: crypto.randomUUID(),
    userId: 'tech-1',
    assetId: 'asset-1',
    assetLabel: null,
    payload: {
      serviceDate: '2026-10-20T00:00:00.000Z',
      serviceType: 'Inspection',
    },
    ...overrides,
  };
}

function storedRecord(id: string): ServiceRecord {
  return { id } as ServiceRecord;
}

describe('syncOutbox', () => {
  let create: MockInstance<typeof serviceRecordsApi.create>;

  beforeEach(() => {
    create = vi.spyOn(serviceRecordsApi, 'create');
  });

  it('sends items oldest first with their idempotency key', async () => {
    const first = await enqueueServiceRecord(input());
    const second = await enqueueServiceRecord(input());
    create
      .mockResolvedValueOnce(storedRecord('server-1'))
      .mockResolvedValueOnce(storedRecord('server-2'));

    const result = await syncOutbox('tech-1');

    expect(result.syncedIds).toEqual([first.clientRequestId, second.clientRequestId]);
    expect(create).toHaveBeenNthCalledWith(
      1,
      'asset-1',
      expect.objectContaining({
        clientRequestId: first.clientRequestId,
        clientCapturedAt: first.clientCapturedAt,
        serviceType: 'Inspection',
      }),
      expect.anything(),
    );
    expect((await getOutboxItem(first.clientRequestId))?.serverRecordId).toBe(
      'server-1',
    );
  });

  it('never sends items that belong to another account', async () => {
    await enqueueServiceRecord(input({ userId: 'tech-2' }));

    const result = await syncOutbox('tech-1');

    expect(create).not.toHaveBeenCalled();
    expect(result.syncedIds).toEqual([]);
  });

  it('keeps the item and stops when the server cannot be reached', async () => {
    const first = await enqueueServiceRecord(input());
    await enqueueServiceRecord(input());
    create.mockRejectedValueOnce(new NetworkError(new TypeError('Failed to fetch')));

    const result = await syncOutbox('tech-1');

    expect(result.interrupted).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
    const item = await getOutboxItem(first.clientRequestId);
    expect(item?.status).toBe('pending');
    expect(item?.attempts).toBe(1);
  });

  it('retries server errors later', async () => {
    const item = await enqueueServiceRecord(input());
    create.mockRejectedValueOnce(new ApiClientError(503, 'Unavailable'));

    const result = await syncOutbox('tech-1');

    expect(result.interrupted).toBe(true);
    expect((await getOutboxItem(item.clientRequestId))?.status).toBe('pending');
  });

  it('marks client errors for attention and continues with the next item', async () => {
    const rejected = await enqueueServiceRecord(input());
    const next = await enqueueServiceRecord(input());
    create
      .mockRejectedValueOnce(
        new ApiClientError(400, 'Cannot create a service record for an inactive asset.'),
      )
      .mockResolvedValueOnce(storedRecord('server-2'));

    const result = await syncOutbox('tech-1');

    expect(result.needsAttentionIds).toEqual([rejected.clientRequestId]);
    expect(result.syncedIds).toEqual([next.clientRequestId]);
    expect(await getOutboxItem(rejected.clientRequestId)).toMatchObject({
      status: 'needs_attention',
      lastError: {
        statusCode: 400,
        message: 'Cannot create a service record for an inactive asset.',
      },
    });
  });

  it('stops on 401 and keeps the item pending without counting an attempt', async () => {
    const item = await enqueueServiceRecord(input());
    create.mockRejectedValueOnce(new ApiClientError(401, 'Unauthorized'));

    const result = await syncOutbox('tech-1');

    expect(result.authRequired).toBe(true);
    expect(await getOutboxItem(item.clientRequestId)).toMatchObject({
      status: 'pending',
      attempts: 0,
    });
  });
});
