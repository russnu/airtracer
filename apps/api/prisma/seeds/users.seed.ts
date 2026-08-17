import { PrismaClient } from '../../generated/prisma/client';
import * as argon2 from 'argon2';

export async function seedUsers(prisma: PrismaClient) {
  const passwordHash = await argon2.hash('password');

  const users = await Promise.all([
    prisma.user.upsert({
      where: {
        email: 'admin@airtracer.local',
      },
      update: {},
      create: {
        email: 'admin@airtracer.local',
        passwordHash,
        firstName: 'System',
        lastName: 'Administrator',
        phoneNumber: '09170000001',
        isVerified: true,
        isActive: true,
      },
    }),

    prisma.user.upsert({
      where: {
        email: 'technician@airtracer.local',
      },
      update: {},
      create: {
        email: 'technician@airtracer.local',
        passwordHash,
        firstName: 'John',
        lastName: 'Technician',
        phoneNumber: '09170000002',
        isVerified: true,
        isActive: true,
      },
    }),

    prisma.user.upsert({
      where: {
        email: 'owner@airtracer.local',
      },
      update: {},
      create: {
        email: 'owner@airtracer.local',
        passwordHash,
        firstName: 'Jane',
        lastName: 'Owner',
        phoneNumber: '09170000003',
        isVerified: true,
        isActive: true,
      },
    }),
  ]);

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: 'ADMIN' },
  });

  const technicianRole = await prisma.role.findUniqueOrThrow({
    where: { name: 'TECHNICIAN' },
  });

  const ownerRole = await prisma.role.findUniqueOrThrow({
    where: { name: 'OWNER' },
  });

  const adminUser = users.find(
    (user) => user.email === 'admin@airtracer.local',
  );

  const technicianUser = users.find(
    (user) => user.email === 'technician@airtracer.local',
  );

  const ownerUser = users.find(
    (user) => user.email === 'owner@airtracer.local',
  );

  if (!adminUser || !technicianUser || !ownerUser) {
    throw new Error('Failed to create seed users');
  }

  await prisma.userRole.createMany({
    data: [
      {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
      {
        userId: technicianUser.id,
        roleId: technicianRole.id,
      },
      {
        userId: ownerUser.id,
        roleId: ownerRole.id,
      },
    ],
    skipDuplicates: true,
  });

  console.log(`✓ Seeded ${users.length} users`);
  console.log('✓ Assigned user roles');
}
