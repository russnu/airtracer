import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAuditLogInput } from './types/create-audit-log.type';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}
  //-------------------------------------------------------------//
  private generateHash(data: unknown): string {
    return createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }
  //-------------------------------------------------------------//
  // Must be called inside the caller's transaction so the entry commits or rolls
  // back with the change it records.
  async log(input: CreateAuditLogInput, tx: Prisma.TransactionClient) {
    // Serialize writers per asset until this transaction ends, so concurrent
    // entries cannot both chain onto the same previous hash.
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${input.assetId}))`;

    const previousAudit = await tx.auditLog.findFirst({
      where: {
        assetId: input.assetId,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const previousHash = previousAudit?.hash ?? null;
    const createdAt = new Date();

    const hashPayload = {
      actorId: input.actorId ?? null,
      assetId: input.assetId,
      event: input.event,
      payload: input.payload ?? null,
      previousHash,
      createdAt: createdAt.toISOString(),
    };

    const hash = this.generateHash(hashPayload);

    return tx.auditLog.create({
      data: {
        actorId: input.actorId,
        assetId: input.assetId,
        event: input.event,
        payload: input.payload,
        previousHash,
        hash,
        createdAt,
      },
    });
  }
  //-------------------------------------------------------------//
  async getAssetHistory(assetId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        assetId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
  //-------------------------------------------------------------//
}
