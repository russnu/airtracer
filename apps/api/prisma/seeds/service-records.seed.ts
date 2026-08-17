import { PrismaClient } from '../../generated/prisma/client';

export async function seedServiceRecords(prisma: PrismaClient) {
  const technician = await prisma.user.findUniqueOrThrow({
    where: {
      email: 'technician@airtracer.local',
    },
  });

  const assets = await prisma.asset.findMany({
    orderBy: {
      serialNumber: 'asc',
    },
  });

  if (assets.length < 3) {
    throw new Error('Expected at least 3 seeded assets');
  }

  const serviceRecords = [
    {
      assetId: assets[0].id,
      technicianId: technician.id,
      serviceDate: new Date('2025-07-15'),
      serviceType: 'PREVENTIVE_MAINTENANCE',
      description: 'Routine cleaning and inspection.',
    },
    {
      assetId: assets[0].id,
      technicianId: technician.id,
      serviceDate: new Date('2026-01-15'),
      serviceType: 'PREVENTIVE_MAINTENANCE',
      description: 'Six-month preventive maintenance service.',
    },
    {
      assetId: assets[1].id,
      technicianId: technician.id,
      serviceDate: new Date('2025-09-10'),
      serviceType: 'CLEANING',
      description: 'Indoor and outdoor unit cleaning.',
    },
    {
      assetId: assets[2].id,
      technicianId: technician.id,
      serviceDate: new Date('2026-02-20'),
      serviceType: 'INSPECTION',
      description: 'General operational inspection.',
    },
  ];

  await prisma.serviceRecord.createMany({
    data: serviceRecords,
  });

  console.log(`✓ Seeded ${serviceRecords.length} service records`);
}
