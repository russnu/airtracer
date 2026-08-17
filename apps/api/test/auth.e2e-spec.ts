import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RoleName } from '../src/roles/enums/role-name.enum';
import * as argon2 from 'argon2';

describe('Auth E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testPassword = 'password123';

  const registeredEmail = `e2e-register-${Date.now()}@example.com`;
  const inactiveEmail = `e2e-inactive-${Date.now()}@example.com`;

  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [registeredEmail, inactiveEmail],
        },
      },
    });

    await app.close();
    await prisma.$disconnect();
  });

  // ============================================================= //
  // REGISTER
  // ============================================================= //

  describe('POST /auth/register', () => {
    // AUTH-001
    it('AUTH-001: should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: registeredEmail,
          password: testPassword,
          firstName: 'John',
          lastName: 'Doe',
          phoneNumber: undefined,
          role: RoleName.OWNER,
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');

      expect(response.body.user).toMatchObject({
        email: registeredEmail,
        firstName: 'John',
        lastName: 'Doe',
        roles: [RoleName.OWNER],
      });

      expect(response.body.user).not.toHaveProperty('passwordHash');

      // Verify that the user actually exists in the DB
      const user = await prisma.user.findUnique({
        where: {
          email: registeredEmail,
        },
      });

      expect(user).not.toBeNull();
      expect(user?.email).toBe(registeredEmail);

      // Password should not be stored as plaintext
      expect(user?.passwordHash).not.toBe(testPassword);
    });

    // AUTH-002
    it('AUTH-002: should reject an already registered email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: registeredEmail,
          password: testPassword,
          firstName: 'Jane',
          lastName: 'Doe',
          phoneNumber: undefined,
          role: RoleName.OWNER,
        })
        .expect(409);

      expect(response.body.message).toBe('Email is already registered.');
    });

    // AUTH-003
    it('AUTH-003: should reject public ADMIN registration', async () => {
      const adminEmail = `e2e-admin-${Date.now()}@example.com`;

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: adminEmail,
          password: testPassword,
          firstName: 'Admin',
          lastName: 'User',
          phoneNumber: undefined,
          role: RoleName.ADMIN,
        })
        .expect(403);

      expect(response.body.message).toBe(
        'Administrator accounts cannot be created through public registration.',
      );

      // Make sure the user wasn't created
      const user = await prisma.user.findUnique({
        where: {
          email: adminEmail,
        },
      });

      expect(user).toBeNull();
    });
  });

  // ============================================================= //
  // LOGIN
  // ============================================================= //

  describe('POST /auth/login', () => {
    // AUTH-004
    it('AUTH-004: should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registeredEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');

      expect(response.body.user).toMatchObject({
        email: registeredEmail,
        firstName: 'John',
        lastName: 'Doe',
        roles: [RoleName.OWNER],
      });

      expect(response.body.user).not.toHaveProperty('passwordHash');

      accessToken = response.body.accessToken;
    });

    // AUTH-005
    it('AUTH-005: should reject an incorrect password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registeredEmail,
          password: 'wrong-password',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password.');
    });

    // AUTH-006
    it('AUTH-006: should reject a nonexistent email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'does-not-exist@example.com',
          password: testPassword,
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password.');
    });

    // AUTH-007
    it('AUTH-007: should reject an inactive account', async () => {
      // Get the OWNER role
      const ownerRole = await prisma.role.findUnique({
        where: {
          name: RoleName.OWNER,
        },
      });

      if (!ownerRole) {
        throw new Error('OWNER role not found in test database.');
      }

      const passwordHash = await argon2.hash(testPassword);

      // Create inactive user directly in DB
      await prisma.user.create({
        data: {
          email: inactiveEmail,
          passwordHash,
          firstName: 'Inactive',
          lastName: 'User',
          isActive: false,

          roles: {
            create: {
              roleId: ownerRole.id,
            },
          },
        },
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: inactiveEmail,
          password: testPassword,
        })
        .expect(403);

      expect(response.body.message).toBe('Your account has been deactivated.');
    });
  });

  // ============================================================= //
  // /auth/me
  // ============================================================= //

  describe('GET /auth/me', () => {
    // AUTH-008
    it('AUTH-008: should access /auth/me with a valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        email: registeredEmail,
        firstName: 'John',
        lastName: 'Doe',
        roles: [RoleName.OWNER],
      });

      expect(response.body).not.toHaveProperty('passwordHash');
    });

    // AUTH-009
    it('AUTH-009: should reject /auth/me without a token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    // AUTH-010
    it('AUTH-010: should reject /auth/me with an invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
