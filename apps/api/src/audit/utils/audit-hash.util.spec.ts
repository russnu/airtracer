import { createHash } from 'crypto';

import { Event } from '../../../generated/prisma/enums';

import { computeAuditHash } from './audit-hash.util';

describe('computeAuditHash', () => {
  const input = {
    actorId: 'user-123',
    assetId: 'asset-123',
    event: Event.SERVICE_RECORD_CREATED,
    payload: { serviceRecordId: 'service-123' },
    previousHash: 'previous-hash',
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
  };

  it('should hash the fields in their fixed order', () => {
    const expected = createHash('sha256')
      .update(
        JSON.stringify({
          actorId: 'user-123',
          assetId: 'asset-123',
          event: 'SERVICE_RECORD_CREATED',
          payload: { serviceRecordId: 'service-123' },
          previousHash: 'previous-hash',
          createdAt: '2026-08-20T10:00:00.000Z',
        }),
      )
      .digest('hex');

    expect(computeAuditHash(input)).toBe(expected);
  });

  it('should change when the previous hash changes', () => {
    expect(computeAuditHash(input)).not.toBe(
      computeAuditHash({ ...input, previousHash: null }),
    );
  });
});
