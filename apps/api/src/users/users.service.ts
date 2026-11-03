import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleName } from '../roles/enums/role-name.enum';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  //-------------------------------------------------------------//
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }
  //-------------------------------------------------------------//
  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },

      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }
  //-------------------------------------------------------------//
  async create(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    roleName: RoleName;
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,

        roles: {
          create: {
            role: {
              connect: {
                name: data.roleName,
              },
            },
          },
        },
      },

      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }
  //-------------------------------------------------------------//
  // Adding a role the user already holds changes nothing. Roles are never
  // removed: assets and service records depend on the role that made them.
  async addRole(userId: string, roleName: RoleName) {
    const role = await this.prisma.role.findUniqueOrThrow({
      where: { name: roleName },
    });

    await this.prisma.userRole.createMany({
      data: [{ userId, roleId: role.id }],
      skipDuplicates: true,
    });

    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }
  //-------------------------------------------------------------//
  async updateLastLogin(userId: string) {
    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }
}
