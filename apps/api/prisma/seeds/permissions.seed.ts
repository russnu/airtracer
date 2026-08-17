import { PrismaClient } from '../../generated/prisma/client';

export async function seedPermissions(prisma: PrismaClient) {
  const permissions = [
    {
      name: 'USER_READ',
      description: 'View user accounts',
    },
    {
      name: 'USER_CREATE',
      description: 'Create user accounts',
    },
    {
      name: 'USER_UPDATE',
      description: 'Update user accounts',
    },
    {
      name: 'USER_DELETE',
      description: 'Delete user accounts',
    },

    {
      name: 'ROLE_READ',
      description: 'View roles',
    },
    {
      name: 'ROLE_CREATE',
      description: 'Create roles',
    },
    {
      name: 'ROLE_UPDATE',
      description: 'Update roles',
    },
    {
      name: 'ROLE_DELETE',
      description: 'Delete roles',
    },

    {
      name: 'ASSET_READ',
      description: 'View air conditioning assets',
    },
    {
      name: 'ASSET_CREATE',
      description: 'Register air conditioning assets',
    },
    {
      name: 'ASSET_UPDATE',
      description: 'Update air conditioning asset information',
    },
    {
      name: 'ASSET_DELETE',
      description: 'Delete air conditioning assets',
    },

    {
      name: 'SERVICE_RECORD_READ',
      description: 'View service records',
    },
    {
      name: 'SERVICE_RECORD_CREATE',
      description: 'Create service records',
    },
    {
      name: 'SERVICE_RECORD_UPDATE',
      description: 'Update service records',
    },
    {
      name: 'SERVICE_RECORD_DELETE',
      description: 'Delete service records',
    },
  ];

  await prisma.permission.createMany({
    data: permissions,
    skipDuplicates: true,
  });

  console.log(`✓ Seeded ${permissions.length} permissions`);
}
