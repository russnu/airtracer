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
    it('AUTH-003: should reject a role other than OWNER or TECHNICIAN', async () => {
      const adminEmail = `e2e-admin-${Date.now()}@example.com`;

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: adminEmail,
          password: testPassword,
          firstName: 'Admin',
          lastName: 'User',
          phoneNumber: undefined,
          role: 'ADMIN',
        })
        .expect(400);

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

  // ============================================================= //
  // /auth/me/roles
  // ============================================================= //

  describe('POST /auth/me/roles', () => {
    // AUTH-011
    it('AUTH-011: should add the other role to the signed-in account', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/me/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ role: RoleName.TECHNICIAN })
        .expect(200);

      expect(response.body.email).toBe(registeredEmail);
      expect(response.body.roles).toHaveLength(2);
      expect(response.body.roles).toEqual(
        expect.arrayContaining([RoleName.OWNER, RoleName.TECHNICIAN]),
      );
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    // AUTH-012
    it('AUTH-012: should leave a held role unchanged', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/me/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ role: RoleName.TECHNICIAN })
        .expect(200);

      expect(response.body.roles).toHaveLength(2);
    });

    // AUTH-013
    it('AUTH-013: should let a user with both roles use both roles', async () => {
      await request(app.getHttpServer())
        .get('/assets')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/service-records/mine')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    // AUTH-014
    it('AUTH-014: should reject a role other than OWNER or TECHNICIAN', async () => {
      await request(app.getHttpServer())
        .post('/auth/me/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ role: 'ADMIN' })
        .expect(400);
    });

    // AUTH-015
    it('AUTH-015: should reject adding a role without a token', async () => {
      await request(app.getHttpServer())
        .post('/auth/me/roles')
        .send({ role: RoleName.TECHNICIAN })
        .expect(401);
    });
  });
});
