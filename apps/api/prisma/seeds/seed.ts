import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { seedPermissions } from './permissions.seed';
import { seedRoles } from './roles.seed';
import { seedUsers } from './users.seed';
import { seedAssets } from './assets.seed';
import { seedServiceRecords } from './service-records.seed';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seed...\n');

  await seedPermissions(prisma);
  await seedRoles(prisma);
  await seedUsers(prisma);
  await seedAssets(prisma);
  await seedServiceRecords(prisma);

  console.log('\n✅ Database seed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
