import { PrismaClient } from '../../generated/prisma/client';

export async function seedRoles(prisma: PrismaClient) {
  const roles = [
    {
      name: 'ADMIN',
      description: 'Full administrative access',
    },
    {
      name: 'TECHNICIAN',
      description: 'Access to assets and maintenance service records',
    },
    {
      name: 'OWNER',
      description: 'Access to owned assets and their service history',
    },
  ];

  await prisma.role.createMany({
    data: roles,
    skipDuplicates: true,
  });

  const [admin, technician, owner] = await Promise.all([
    prisma.role.findUniqueOrThrow({
      where: { name: 'ADMIN' },
    }),
    prisma.role.findUniqueOrThrow({
      where: { name: 'TECHNICIAN' },
    }),
    prisma.role.findUniqueOrThrow({
      where: { name: 'OWNER' },
    }),
  ]);

  const permissions = await prisma.permission.findMany();

  const permissionMap = new Map(
    permissions.map((permission) => [permission.name, permission.id]),
  );

  const getPermissionId = (name: string) => {
    const id = permissionMap.get(name);

    if (!id) {
      throw new Error(`Permission "${name}" not found`);
    }

    return id;
  };

  const adminPermissions = permissions.map((permission) => ({
    roleId: admin.id,
    permissionId: permission.id,
  }));

  const technicianPermissions = [
    'ASSET_READ',
    'ASSET_CREATE',
    'ASSET_UPDATE',
    'SERVICE_RECORD_READ',
    'SERVICE_RECORD_CREATE',
    'SERVICE_RECORD_UPDATE',
  ].map((permissionName) => ({
    roleId: technician.id,
    permissionId: getPermissionId(permissionName),
  }));

  const ownerPermissions = [
    'ASSET_READ',
    'ASSET_CREATE',
    'ASSET_UPDATE',
    'SERVICE_RECORD_READ',
  ].map((permissionName) => ({
    roleId: owner.id,
    permissionId: getPermissionId(permissionName),
  }));

  await prisma.rolePermission.createMany({
    data: [...adminPermissions, ...technicianPermissions, ...ownerPermissions],
    skipDuplicates: true,
  });

  console.log(`✓ Seeded ${roles.length} roles`);
  console.log('✓ Seeded role permissions');
}
