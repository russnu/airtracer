import { Prisma, Event } from '../../../generated/prisma/client';

export interface CreateAuditLogInput {
  actorId?: string;
  assetId: string;
  event: Event;
  payload?: Prisma.InputJsonValue;
}
