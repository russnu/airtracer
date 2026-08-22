import { createHash } from 'crypto';

import { Event, Prisma, PrismaClient } from '../../generated/prisma/client';

function generateHash(data: unknown): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export async function seedAuditLogs(prisma: PrismaClient) {
  const owner = await prisma.user.findUniqueOrThrow({
    where: {
      email: 'owner@airtracer.local',
    },
  });

  const assets = await prisma.asset.findMany({
    where: {
      serialNumber: {
        in: ['DAIKIN-DEMO-000001', 'PANASONIC-DEMO-000001', 'LG-DEMO-000001'],
      },
    },
  });

  const assetMap = new Map(assets.map((asset) => [asset.serialNumber, asset]));

  const daikin = assetMap.get('DAIKIN-DEMO-000001');
  const panasonic = assetMap.get('PANASONIC-DEMO-000001');
  const lg = assetMap.get('LG-DEMO-000001');

  if (!daikin || !panasonic || !lg) {
    throw new Error('Demo assets must be seeded before audit logs');
  }

  // ------------------------------------------------------------------
  // Helper for creating one audit event in an asset's hash chain.
  // ------------------------------------------------------------------

  async function createAuditLog(
    assetId: string,
    event: Event,
    payload: Prisma.InputJsonValue,
    createdAt: Date,
  ) {
    const previousAudit = await prisma.auditLog.findFirst({
      where: {
        assetId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const previousHash = previousAudit?.hash ?? null;

    const hashPayload = {
      actorId: owner.id,
      assetId,
      event,
      payload,
      previousHash,
      createdAt: createdAt.toISOString(),
    };

    const hash = generateHash(hashPayload);

    return prisma.auditLog.create({
      data: {
        actorId: owner.id,
        assetId,
        event,
        payload,
        previousHash,
        hash,
        createdAt,
      },
    });
  }

  // ==================================================================
  // DAIKIN
  // ==================================================================

  await createAuditLog(
    daikin.id,
    Event.ASSET_CREATED,
    {
      brand: daikin.brand,
      model: daikin.model,
      serialNumber: daikin.serialNumber,
      equipmentTypeId: daikin.equipmentTypeId,
      installationDate: daikin.installationDate?.toISOString() ?? null,
      location: daikin.location,
      ownerId: daikin.ownerId,
    },
    new Date('2025-01-15T09:00:00Z'),
  );

  await createAuditLog(
    daikin.id,
    Event.ASSET_UPDATED,
    {
      changes: {
        location: {
          from: 'Living Room',
          to: 'Master Bedroom',
        },
      },
    },
    new Date('2025-02-01T10:00:00Z'),
  );

  await createAuditLog(
    daikin.id,
    Event.SERVICE_RECORD_CREATED,
    {
      serviceType: 'Preventive Maintenance',
      serviceDate: '2025-04-15T09:00:00Z',
      description: 'Routine preventive maintenance',
    },
    new Date('2025-04-15T09:00:00Z'),
  );

  await createAuditLog(
    daikin.id,
    Event.SERVICE_RECORD_COMPLETED,
    {
      serviceDate: '2025-04-15T09:00:00Z',
      status: 'COMPLETED',
    },
    new Date('2025-04-15T11:00:00Z'),
  );

  // ==================================================================
  // PANASONIC
  // ==================================================================

  await createAuditLog(
    panasonic.id,
    Event.ASSET_CREATED,
    {
      brand: panasonic.brand,
      model: panasonic.model,
      serialNumber: panasonic.serialNumber,
      equipmentTypeId: panasonic.equipmentTypeId,
      installationDate: panasonic.installationDate?.toISOString() ?? null,
      location: panasonic.location,
      ownerId: panasonic.ownerId,
    },
    new Date('2025-03-10T09:00:00Z'),
  );

  await createAuditLog(
    panasonic.id,
    Event.SERVICE_RECORD_CREATED,
    {
      serviceType: 'Cleaning',
      serviceDate: '2025-07-10T09:00:00Z',
      description: 'Indoor and outdoor unit cleaning',
    },
    new Date('2025-07-10T09:00:00Z'),
  );

  await createAuditLog(
    panasonic.id,
    Event.SERVICE_RECORD_COMPLETED,
    {
      serviceDate: '2025-07-10T09:00:00Z',
      status: 'COMPLETED',
    },
    new Date('2025-07-10T11:00:00Z'),
  );

  // ==================================================================
  // LG
  // ==================================================================

  await createAuditLog(
    lg.id,
    Event.ASSET_CREATED,
    {
      brand: lg.brand,
      model: lg.model,
      serialNumber: lg.serialNumber,
      equipmentTypeId: lg.equipmentTypeId,
      installationDate: lg.installationDate?.toISOString() ?? null,
      location: lg.location,
      ownerId: lg.ownerId,
    },
    new Date('2025-06-20T09:00:00Z'),
  );

  await createAuditLog(
    lg.id,
    Event.ASSET_DEACTIVATED,
    {
      previousStatus: true,
      newStatus: false,
    },
    new Date('2025-08-01T10:00:00Z'),
  );

  console.log('✓ Seeded audit logs');
}
