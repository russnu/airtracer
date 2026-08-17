import { PrismaClient } from '../../generated/prisma/client';

export async function seedAssets(prisma: PrismaClient) {
  const owner = await prisma.user.findUniqueOrThrow({
    where: {
      email: 'owner@airtracer.local',
    },
  });

  const assets = [
    {
      qrCode: 'AIRTRACER-AC-000001',
      brand: 'Daikin',
      model: 'FTKF35',
      serialNumber: 'DAIKIN-DEMO-000001',
      installationDate: new Date('2025-01-15'),
      location: 'Living Room',
      ownerId: owner.id,
    },
    {
      qrCode: 'AIRTRACER-AC-000002',
      brand: 'Panasonic',
      model: 'CS-XU12',
      serialNumber: 'PANASONIC-DEMO-000001',
      installationDate: new Date('2025-03-10'),
      location: 'Bedroom',
      ownerId: owner.id,
    },
    {
      qrCode: 'AIRTRACER-AC-000003',
      brand: 'LG',
      model: 'DualCool',
      serialNumber: 'LG-DEMO-000001',
      installationDate: new Date('2025-06-20'),
      location: 'Office',
      ownerId: owner.id,
    },
  ];

  await prisma.asset.createMany({
    data: assets,
    skipDuplicates: true,
  });

  console.log(`✓ Seeded ${assets.length} assets`);
}
