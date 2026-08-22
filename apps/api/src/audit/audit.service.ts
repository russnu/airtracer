// TODO: transaction

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
  async log(
    input: CreateAuditLogInput,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const previousAudit = await this.prisma.auditLog.findFirst({
      where: {
        assetId: input.assetId,
      },
      orderBy: {
        createdAt: 'desc',
      },
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
