import * as argon2 from 'argon2';

import { Prisma } from '../../generated/prisma/client';
import { RoleName } from '../../src/roles/enums/role-name.enum';

export const DEMO_USERS = {
  admin: {
    email: 'admin@airtracer.local',
    firstName: 'System',
    lastName: 'Administrator',
    phoneNumber: '09170000001',
    role: RoleName.ADMIN,
  },
  technician: {
    email: 'technician@airtracer.local',
    firstName: 'John',
    lastName: 'Technician',
    phoneNumber: '09170000002',
    role: RoleName.TECHNICIAN,
  },
  owner: {
    email: 'owner@airtracer.local',
    firstName: 'Jane',
    lastName: 'Owner',
    phoneNumber: '09170000003',
    role: RoleName.OWNER,
  },
} as const;

export type DemoUserKey = keyof typeof DEMO_USERS;

// Create-only: an existing user with a demo email is left exactly as it is,
// including its password and roles. Roles are assigned only on creation.
export async function seedUsers(
  tx: Prisma.TransactionClient,
): Promise<Record<DemoUserKey, string>> {
  const passwordHash = await argon2.hash('password');
  const ids = {} as Record<DemoUserKey, string>;
  let created = 0;

  for (const key of Object.keys(DEMO_USERS) as DemoUserKey[]) {
    const { role: roleName, ...profile } = DEMO_USERS[key];

    const role = await tx.role.findUniqueOrThrow({
      where: { name: roleName },
    });

    const existing = await tx.user.findUnique({
      where: { email: profile.email },
      include: { roles: true },
    });

    if (existing) {
      if (!existing.roles.some((userRole) => userRole.roleId === role.id)) {
        console.warn(
          `! ${profile.email} exists without the ${roleName} role; its sample data may not be visible to it.`,
        );
      }

      ids[key] = existing.id;
      continue;
    }

    const user = await tx.user.create({
      data: {
        ...profile,
        passwordHash,
        isVerified: true,
        isActive: true,
        roles: {
          create: { roleId: role.id },
        },
      },
    });

    ids[key] = user.id;
    created++;
  }

  console.log(
    `✓ Demo users ready (${created} created, ${3 - created} already existed)`,
  );

  return ids;
}
