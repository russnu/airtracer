import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const connectionString = process.env.DATABASE_URL;

async function main() {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }

  const adapter = new PrismaPg({
    connectionString,
  });

  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.user.createMany({
      data: [
        {
          email: 'john@example.com',
          name: 'John Doe',
        },
        {
          email: 'jane@example.com',
          name: 'Jane Doe',
        },
        {
          email: 'alice@example.com',
          name: 'Alice Smith',
        },
      ],
    });

    console.log('Seed completed successfully.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
