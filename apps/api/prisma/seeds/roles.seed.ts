import { Prisma } from '../../generated/prisma/client';
import { RoleName } from '../../src/roles/enums/role-name.enum';

import { PERMISSIONS, PermissionName } from './permissions.seed';

// Mirrors the @Roles guards on the controllers.
const ROLES: {
  name: RoleName;
  description: string;
  permissions: readonly PermissionName[];
}[] = [
  {
    name: RoleName.ADMIN,
    description: 'Full administrative access',
    permissions: PERMISSIONS.map((permission) => permission.name),
  },
  {
    name: RoleName.TECHNICIAN,
    description: 'Records and voids maintenance service records',
    permissions: [
      'ASSET_READ',
      'SERVICE_RECORD_READ',
      'SERVICE_RECORD_CREATE',
      'SERVICE_RECORD_VOID',
      'SERVICE_PHOTO_READ',
      'SERVICE_PHOTO_CREATE',
      'SERVICE_PHOTO_UPDATE',
      'SERVICE_PHOTO_DELETE',
    ],
  },
  {
    name: RoleName.OWNER,
    description: 'Manages owned assets and views their service history',
    permissions: [
      'ASSET_READ',
      'ASSET_CREATE',
      'ASSET_UPDATE',
      'ASSET_DELETE',
      'QR_MANAGE',
      'SERVICE_RECORD_READ',
      'SERVICE_PHOTO_READ',
      'SERVICE_PHOTO_CREATE',
    ],
  },
];

// Roles are upserted by name and never deleted: deleting a role would
// cascade to the users' role assignments.
export async function seedRoles(tx: Prisma.TransactionClient) {
  const permissions = await tx.permission.findMany();
  const permissionIds = new Map(
    permissions.map((permission) => [permission.name, permission.id]),
  );

  for (const { name, description, permissions: granted } of ROLES) {
    const role = await tx.role.upsert({
      where: { name },
      update: { description },
      create: { name, description },
    });

    const grantedIds = granted.map((permissionName) => {
      const id = permissionIds.get(permissionName);

      if (!id) {
        throw new Error(`Permission "${permissionName}" not found`);
      }

      return id;
    });

    await tx.rolePermission.deleteMany({
      where: {
        roleId: role.id,
        permissionId: { notIn: grantedIds },
      },
    });

    await tx.rolePermission.createMany({
      data: grantedIds.map((permissionId) => ({
        roleId: role.id,
        permissionId,
      })),
      skipDuplicates: true,
    });
  }

  console.log(`✓ Seeded ${ROLES.length} roles and their permissions`);
}
