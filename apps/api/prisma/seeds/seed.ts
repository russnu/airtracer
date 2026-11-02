import { appendFileSync } from 'fs';
import { join } from 'path';

import { PrismaClient, Prisma } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { assertTargetAllowed, describeTarget } from './guard';
import { resetSampleData } from './reset.seed';
import { seedPermissions } from './permissions.seed';
import { seedRoles } from './roles.seed';
import { seedUsers } from './users.seed';
import { seedEquipmentTypes } from './equipment-type.seed';
import { seedSampleData } from './sample-data.seed';

// Seeds roles, permissions, equipment types and demo users, then replaces
// all assets, QR codes, service records, photos and audit logs with the
// sample data. Existing users and their roles are never changed.
//
//   --dry-run       run everything, print the summary, then roll back
//   --allow-remote  permit a database host other than localhost

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const allowRemote = args.has('--allow-remote');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const target = describeTarget(connectionString);

console.log(
  `🌱 Seeding "${target.database}" on ${target.host}` +
    (dryRun ? ' (dry run: changes will be rolled back)' : '') +
    '\n',
);

assertTargetAllowed(target, allowRemote);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

class DryRunRollback extends Error {}

async function snapshotUsers(tx: Prisma.TransactionClient) {
  const users = await tx.user.findMany({
    orderBy: { id: 'asc' },
    include: {
      roles: {
        select: { roleId: true, assignedAt: true },
        orderBy: { roleId: 'asc' },
      },
    },
  });

  return new Map(users.map((user) => [user.id, JSON.stringify(user)]));
}

// Every user present before the seed must be byte-for-byte unchanged.
function assertUsersUnchanged(
  before: Map<string, string>,
  after: Map<string, string>,
) {
  for (const [id, snapshot] of before) {
    if (after.get(id) !== snapshot) {
      throw new Error(`User ${id} changed during seeding; rolled back`);
    }
  }
}

// Each asset's entries must link: the first has no previous hash and every
// later one points at the entry before it. Hashes cannot be recomputed from
// stored rows, because JSONB does not keep the payload's key order.
async function assertAuditChainsLinked(tx: Prisma.TransactionClient) {
  const logs = await tx.auditLog.findMany({
    orderBy: [{ assetId: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    select: { assetId: true, hash: true, previousHash: true },
  });

  let previous: (typeof logs)[number] | undefined;

  for (const log of logs) {
    const expected =
      previous && previous.assetId === log.assetId ? previous.hash : null;

    if (log.previousHash !== expected) {
      throw new Error(`Audit chain for asset ${log.assetId} is not linked`);
    }

    previous = log;
  }
}

async function main() {
  let orphanedStorageKeys: string[] = [];

  try {
    await prisma.$transaction(
      async (tx) => {
        const usersBefore = await snapshotUsers(tx);

        const reset = await resetSampleData(tx);
        orphanedStorageKeys = reset.orphanedStorageKeys;
        console.log(
          `✓ Removed ${reset.assets} assets, ${reset.qrCodes} QR codes, ` +
            `${reset.serviceRecords} service records, ${reset.servicePhotos} photos, ` +
            `${reset.auditLogs} audit logs, ${reset.equipmentTypes} unused equipment types`,
        );

        await seedPermissions(tx);
        await seedRoles(tx);
        const users = await seedUsers(tx);
        const equipmentTypeIds = await seedEquipmentTypes(tx);

        await seedSampleData(tx, {
          ownerId: users.owner,
          technicianId: users.technician,
          equipmentTypeIds,
        });

        const usersAfter = await snapshotUsers(tx);
        assertUsersUnchanged(usersBefore, usersAfter);
        await assertAuditChainsLinked(tx);

        console.log(
          `✓ Users kept unchanged: ${usersBefore.size} ` +
            `(total now ${usersAfter.size})`,
        );

        if (dryRun) {
          throw new DryRunRollback();
        }
      },
      { maxWait: 10_000, timeout: 120_000 },
    );
  } catch (error) {
    if (error instanceof DryRunRollback) {
      console.log('\n↩ Dry run complete; all changes rolled back.');
      return;
    }

    throw error;
  }

  if (orphanedStorageKeys.length > 0) {
    const file = join(__dirname, '.orphaned-storage-keys.txt');

    appendFileSync(
      file,
      `# ${new Date().toISOString()} ${target.database}@${target.host}\n` +
        orphanedStorageKeys.join('\n') +
        '\n',
    );

    console.log(
      `! ${orphanedStorageKeys.length} photo files are no longer referenced. ` +
        `Their keys in the "service-photos" bucket are listed in ${file}`,
    );
  }

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
