import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RoleName } from '../roles/enums/role-name.enum';
import type { AuthenticatedUser } from './types/authenticated-user.type';

describe('AuthController', () => {
  let controller: AuthController;

  const authServiceMock = {
    me: jest.fn(),
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  //-------------------------------------------------------------//

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  //-------------------------------------------------------------//
  // ME
  //-------------------------------------------------------------//

  it('should return the current user', async () => {
    const user: AuthenticatedUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: null,
      isVerified: true,
      isActive: true,
      lastLoginAt: new Date(),
      passwordChangedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      roles: [
        {
          role: {
            id: 'role-123',
            name: RoleName.OWNER,
            description: 'Asset owner',
          },
        },
      ],
    };

    const expectedResponse = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      roles: [RoleName.OWNER],
    };

    authServiceMock.me.mockResolvedValue(expectedResponse);

    const result = await controller.me(user);

    expect(result).toEqual(expectedResponse);

    expect(authServiceMock.me).toHaveBeenCalledWith(user);
  });

  //-------------------------------------------------------------//
  // REGISTER
  //-------------------------------------------------------------//

  it('should register a user', async () => {
    const dto = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: undefined,
      role: RoleName.OWNER,
    };

    const expectedResponse = {
      accessToken: 'fake-jwt',
      user: {
        id: 'user-123',
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roles: [RoleName.OWNER],
      },
    };

    authServiceMock.register.mockResolvedValue(expectedResponse);

    const result = await controller.register(dto);

    expect(result).toEqual(expectedResponse);

    expect(authServiceMock.register).toHaveBeenCalledWith(dto);
  });

  //-------------------------------------------------------------//
  // LOGIN
  //-------------------------------------------------------------//

  it('should login a user', async () => {
    const dto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const expectedResponse = {
      accessToken: 'fake-jwt',
      user: {
        id: 'user-123',
        email: dto.email,
        firstName: 'John',
        lastName: 'Doe',
        roles: [RoleName.OWNER],
      },
    };

    authServiceMock.login.mockResolvedValue(expectedResponse);

    const result = await controller.login(dto);

    expect(result).toEqual(expectedResponse);

    expect(authServiceMock.login).toHaveBeenCalledWith(dto);
  });
});
