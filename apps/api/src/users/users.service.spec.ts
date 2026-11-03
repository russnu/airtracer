import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoleName } from '../roles/enums/role-name.enum';

describe('UsersService', () => {
  let service: UsersService;

  const prismaMock = {
    role: { findUniqueOrThrow: jest.fn() },
    userRole: { createMany: jest.fn() },
    user: { findUniqueOrThrow: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should add a role without duplicating a held one', async () => {
    const user = { id: 'user-123', roles: [] };
    prismaMock.role.findUniqueOrThrow.mockResolvedValue({ id: 'role-tech' });
    prismaMock.user.findUniqueOrThrow.mockResolvedValue(user);

    await expect(
      service.addRole('user-123', RoleName.TECHNICIAN),
    ).resolves.toBe(user);

    expect(prismaMock.role.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { name: RoleName.TECHNICIAN },
    });
    expect(prismaMock.userRole.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'user-123', roleId: 'role-tech' }],
      skipDuplicates: true,
    });
  });
});
