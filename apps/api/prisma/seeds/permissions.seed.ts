import { Prisma } from '../../generated/prisma/client';

export const PERMISSIONS = [
  { name: 'USER_READ', description: 'View user accounts' },
  { name: 'USER_CREATE', description: 'Create user accounts' },
  { name: 'USER_UPDATE', description: 'Update user accounts' },
  { name: 'USER_DELETE', description: 'Delete user accounts' },

  { name: 'ROLE_READ', description: 'View roles' },
  { name: 'ROLE_CREATE', description: 'Create roles' },
  { name: 'ROLE_UPDATE', description: 'Update roles' },
  { name: 'ROLE_DELETE', description: 'Delete roles' },

  { name: 'ASSET_READ', description: 'View air conditioning assets' },
  { name: 'ASSET_CREATE', description: 'Register air conditioning assets' },
  {
    name: 'ASSET_UPDATE',
    description: 'Update or deactivate air conditioning assets',
  },
  { name: 'ASSET_DELETE', description: 'Delete air conditioning assets' },

  {
    name: 'QR_MANAGE',
    description: 'Generate, regenerate, activate and deactivate QR codes',
  },

  { name: 'SERVICE_RECORD_READ', description: 'View service records' },
  { name: 'SERVICE_RECORD_CREATE', description: 'Create service records' },
  {
    name: 'SERVICE_RECORD_VOID',
    description: 'Void service records created by oneself',
  },

  { name: 'SERVICE_PHOTO_READ', description: 'View service photos' },
  { name: 'SERVICE_PHOTO_CREATE', description: 'Upload service photos' },
  {
    name: 'SERVICE_PHOTO_UPDATE',
    description: 'Update service photo captions',
  },
  { name: 'SERVICE_PHOTO_DELETE', description: 'Remove service photos' },
] as const;

export type PermissionName = (typeof PERMISSIONS)[number]['name'];

export async function seedPermissions(tx: Prisma.TransactionClient) {
  for (const permission of PERMISSIONS) {
    await tx.permission.upsert({
      where: { name: permission.name },
      update: { description: permission.description },
      create: permission,
    });
  }

  // Removing a permission cascades to its role assignments.
  const removed = await tx.permission.deleteMany({
    where: {
      name: {
        notIn: PERMISSIONS.map((permission) => permission.name),
      },
    },
  });

  console.log(
    `✓ Seeded ${PERMISSIONS.length} permissions (removed ${removed.count} obsolete)`,
  );
}
