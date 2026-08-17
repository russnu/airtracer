import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RoleName } from '../roles/enums/role-name.enum';

describe('AuthService', () => {
  let service: AuthService;

  const usersServiceMock = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    updateLastLogin: jest.fn(),
  };

  const jwtServiceMock = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  //-------------------------------------------------------------//

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  //-------------------------------------------------------------//
  // REGISTER
  //-------------------------------------------------------------//

  it('should register a user successfully', async () => {
    usersServiceMock.findByEmail.mockResolvedValue(null);

    usersServiceMock.create.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: null,
      roles: [
        {
          role: {
            name: RoleName.OWNER,
          },
        },
      ],
    });

    jwtServiceMock.signAsync.mockResolvedValue('fake-jwt');

    const dto = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: undefined,
      role: RoleName.OWNER,
    };

    const result = await service.register(dto);

    expect(result).toEqual({
      accessToken: 'fake-jwt',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: [RoleName.OWNER],
      },
    });
  });

  //-------------------------------------------------------------//
  // LOGIN
  //-------------------------------------------------------------//

  it('should login a user successfully', async () => {
    const password = 'password123';
    const passwordHash = await argon2.hash(password);

    usersServiceMock.findByEmail.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: null,
      isActive: true,
      roles: [
        {
          role: {
            name: RoleName.OWNER,
          },
        },
      ],
    });

    usersServiceMock.updateLastLogin.mockResolvedValue(undefined);
    jwtServiceMock.signAsync.mockResolvedValue('fake-jwt');

    const dto = {
      email: 'test@example.com',
      password,
    };

    const result = await service.login(dto);

    expect(result).toEqual({
      accessToken: 'fake-jwt',
      user: {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        roles: [RoleName.OWNER],
      },
    });

    expect(usersServiceMock.findByEmail).toHaveBeenCalledWith(dto.email);

    expect(usersServiceMock.updateLastLogin).toHaveBeenCalledWith('user-123');

    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
      sub: 'user-123',
      email: 'test@example.com',
    });
  });

  it('should throw UnauthorizedException when user does not exist', async () => {
    usersServiceMock.findByEmail.mockResolvedValue(null);

    const dto = {
      email: 'unknown@example.com',
      password: 'password123',
    };

    await expect(service.login(dto)).rejects.toThrow(
      new UnauthorizedException('Invalid email or password.'),
    );
  });

  it('should throw UnauthorizedException when password is incorrect', async () => {
    const passwordHash = await argon2.hash('correct-password');

    usersServiceMock.findByEmail.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: null,
      isActive: true,
      roles: [
        {
          role: {
            name: RoleName.OWNER,
          },
        },
      ],
    });

    const dto = {
      email: 'test@example.com',
      password: 'wrong-password',
    };

    await expect(service.login(dto)).rejects.toThrow(
      new UnauthorizedException('Invalid email or password.'),
    );
  });

  it('should throw ForbiddenException when user is inactive', async () => {
    const password = 'password123';
    const passwordHash = await argon2.hash(password);

    usersServiceMock.findByEmail.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: null,
      isActive: false,
      roles: [
        {
          role: {
            name: RoleName.OWNER,
          },
        },
      ],
    });

    const dto = {
      email: 'test@example.com',
      password,
    };

    await expect(service.login(dto)).rejects.toThrow(
      new ForbiddenException('Your account has been deactivated.'),
    );
  });
});
