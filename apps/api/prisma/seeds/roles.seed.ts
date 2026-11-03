import { Prisma } from '../../generated/prisma/client';
import { RoleName } from '../../src/roles/enums/role-name.enum';

// Authorization checks these names through the @Roles guards.
const ROLES: { name: RoleName; description: string }[] = [
  {
    name: RoleName.TECHNICIAN,
    description: 'Records and voids maintenance service records',
  },
  {
    name: RoleName.OWNER,
    description: 'Manages owned assets and views their service history',
  },
];

// Roles are upserted by name and never deleted: deleting a role would
// cascade to the users' role assignments.
export async function seedRoles(tx: Prisma.TransactionClient) {
  for (const { name, description } of ROLES) {
    await tx.role.upsert({
      where: { name },
      update: { description },
      create: { name, description },
    });
  }

  console.log(`✓ Seeded ${ROLES.length} roles`);
}
