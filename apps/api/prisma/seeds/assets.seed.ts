import { PrismaClient } from '../../generated/prisma/client';

export async function seedAssets(prisma: PrismaClient) {
  const owner = await prisma.user.findUniqueOrThrow({
    where: {
      email: 'owner@airtracer.local',
    },
  });

  const wallMountedSplit = await prisma.equipmentType.findUniqueOrThrow({
    where: {
      name: 'Wall-Mounted Split-Type',
    },
  });

  const windowType = await prisma.equipmentType.findUniqueOrThrow({
    where: {
      name: 'Window-Type',
    },
  });

  const portable = await prisma.equipmentType.findUniqueOrThrow({
    where: {
      name: 'Portable',
    },
  });

  const assets = [
    {
      brand: 'Daikin',
      model: 'FTKF35',
      serialNumber: 'DAIKIN-DEMO-000001',
      equipmentTypeId: wallMountedSplit.id,
      installationDate: new Date('2025-01-15'),
      location: 'Living Room',
      ownerId: owner.id,
    },
    {
      brand: 'Panasonic',
      model: 'CS-XU12',
      serialNumber: 'PANASONIC-DEMO-000001',
      equipmentTypeId: windowType.id,
      installationDate: new Date('2025-03-10'),
      location: 'Bedroom',
      ownerId: owner.id,
    },
    {
      brand: 'LG',
      model: 'DualCool',
      serialNumber: 'LG-DEMO-000001',
      equipmentTypeId: portable.id,
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
