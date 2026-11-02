import { createHash } from 'crypto';

import { Event, Prisma } from '../../../generated/prisma/client';

export interface AuditHashInput {
  actorId: string | null;
  assetId: string;
  event: Event;
  payload: Prisma.InputJsonValue | null;
  previousHash: string | null;
  createdAt: Date;
}

// Shared by the audit service and the seeders so both build the same chain.
// The key order is part of the hash; do not reorder.
export function computeAuditHash(input: AuditHashInput): string {
  const hashPayload = {
    actorId: input.actorId,
    assetId: input.assetId,
    event: input.event,
    payload: input.payload,
    previousHash: input.previousHash,
    createdAt: input.createdAt.toISOString(),
  };

  return createHash('sha256').update(JSON.stringify(hashPayload)).digest('hex');
}
