import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RoleName } from '../src/roles/enums/role-name.enum';

describe('QR E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testPassword = 'password123';

  const ownerEmail = `e2e-qr-owner-${Date.now()}@example.com`;
  const otherOwnerEmail = `e2e-qr-other-owner-${Date.now()}@example.com`;

  const equipmentTypeName = `E2E QR Equipment ${Date.now()}`;

  let ownerToken: string;
  let otherOwnerToken: string;

  let ownerId: string;
  let otherOwnerId: string;

  let equipmentTypeId: string;

  let assetId: string;
  let otherAssetId: string;

  let qrToken: string;

  // ============================================================= //
  // SETUP
  // ============================================================= //

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();

    prisma = app.get(PrismaService);

    // --------------------------------------------------------- //
    // Create test equipment type
    // --------------------------------------------------------- //

    const equipmentType = await prisma.equipmentType.create({
      data: {
        name: equipmentTypeName,
        description: 'Equipment type created for QR E2E tests.',
      },
    });

    equipmentTypeId = equipmentType.id;

    // --------------------------------------------------------- //
    // Create first OWNER
    // --------------------------------------------------------- //

    const ownerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: ownerEmail,
        password: testPassword,
        firstName: 'QR',
        lastName: 'Owner',
        phoneNumber: undefined,
        role: RoleName.OWNER,
      })
      .expect(201);

    ownerToken = ownerResponse.body.accessToken;
    ownerId = ownerResponse.body.user.id;

    // --------------------------------------------------------- //
    // Create second OWNER
    // --------------------------------------------------------- //

    const otherOwnerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: otherOwnerEmail,
        password: testPassword,
        firstName: 'Other',
        lastName: 'Owner',
        phoneNumber: undefined,
        role: RoleName.OWNER,
      })
      .expect(201);

    otherOwnerToken = otherOwnerResponse.body.accessToken;
    otherOwnerId = otherOwnerResponse.body.user.id;

    // --------------------------------------------------------- //
    // Create first test asset
    // --------------------------------------------------------- //

    const ownerAsset = await prisma.asset.create({
      data: {
        brand: 'Daikin',
        model: 'FTKF35',
        serialNumber: `E2E-QR-OWNER-${Date.now()}`,
        installationDate: new Date('2025-01-15'),
        location: 'Living Room',
        ownerId,
        equipmentTypeId,
      },
    });

    assetId = ownerAsset.id;

    // --------------------------------------------------------- //
    // Create second test asset
    // --------------------------------------------------------- //

    const otherAsset = await prisma.asset.create({
      data: {
        brand: 'Panasonic',
        model: 'CS-XU12',
        serialNumber: `E2E-QR-OTHER-${Date.now()}`,
        installationDate: new Date('2025-03-10'),
        location: 'Bedroom',
        ownerId: otherOwnerId,
        equipmentTypeId,
      },
    });

    otherAssetId = otherAsset.id;
  });

  // ============================================================= //
  // CLEANUP
  // ============================================================= //

  afterAll(async () => {
    // QRCode -> Asset
    await prisma.qRCode.deleteMany({
      where: {
        assetId: {
          in: [assetId, otherAssetId],
        },
      },
    });

    // Asset -> EquipmentType / User
    await prisma.asset.deleteMany({
      where: {
        id: {
          in: [assetId, otherAssetId],
        },
      },
    });

    // Users
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [ownerId, otherOwnerId],
        },
      },
    });

    // EquipmentType
    await prisma.equipmentType.delete({
      where: {
        id: equipmentTypeId,
      },
    });

    await app.close();
    await prisma.$disconnect();
  });

  // ============================================================= //
  // CREATE QR CODE
  // ============================================================= //

  describe('POST /qr/assets/:assetId', () => {
    // QR-001
    it("QR-001: should create a QR code for the owner's asset", async () => {
      const response = await request(app.getHttpServer())
        .post(`/qr/assets/${assetId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        token: expect.any(String),
        url: expect.any(String),
        asset: {
          id: assetId,
          ownerId,
          equipmentTypeId,
        },
      });

      expect(response.body.token).toMatch(/^ATR_/);

      expect(response.body.url).toBe(
        `${process.env.QR_BASE_URL}/qr/${response.body.token}`,
      );

      qrToken = response.body.token;

      const qrCode = await prisma.qRCode.findUnique({
        where: {
          assetId,
        },
      });

      expect(qrCode).not.toBeNull();
      expect(qrCode?.token).toBe(qrToken);
      expect(qrCode?.assetId).toBe(assetId);
      expect(qrCode?.isActive).toBe(true);
    });

    // QR-002
    it('QR-002: should reject creating a duplicate QR code', async () => {
      const response = await request(app.getHttpServer())
        .post(`/qr/assets/${assetId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(409);

      expect(response.body.message).toBe('This asset already has a QR code');
    });

    // QR-003
    it("QR-003: should reject creating a QR for another owner's asset", async () => {
      const response = await request(app.getHttpServer())
        .post(`/qr/assets/${otherAssetId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);

      expect(response.body.message).toBe('You do not own this asset.');

      const qrCode = await prisma.qRCode.findUnique({
        where: {
          assetId: otherAssetId,
        },
      });

      expect(qrCode).toBeNull();
    });

    // QR-004
    it('QR-004: should reject unauthenticated creation', async () => {
      await request(app.getHttpServer())
        .post(`/qr/assets/${assetId}`)
        .expect(401);
    });

    // QR-005
    it('QR-005: should reject creation for a nonexistent asset', async () => {
      const response = await request(app.getHttpServer())
        .post('/qr/assets/nonexistent-asset-id')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      expect(response.body.message).toBe('Asset not found');
    });
  });

  // ============================================================= //
  // PUBLIC QR VALIDATION
  // ============================================================= //

  describe('GET /qr/:token', () => {
    // QR-006
    it('QR-006: should validate an active QR code without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get(`/qr/${qrToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        token: qrToken,
        assetId,
        isActive: true,
      });

      expect(response.body.asset).toMatchObject({
        id: assetId,
        ownerId,
        equipmentTypeId,
        brand: 'Daikin',
        model: 'FTKF35',
      });
    });

    // QR-007
    it('QR-007: should reject an invalid QR token', async () => {
      const response = await request(app.getHttpServer())
        .get('/qr/ATR_invalid-token')
        .expect(404);

      expect(response.body.message).toBe('QR code not found');
    });
  });

  // ============================================================= //
  // FIND BY ASSET
  // ============================================================= //

  describe('GET /qr/assets/:assetId', () => {
    // QR-008
    it('QR-008: should return the QR code belonging to the asset', async () => {
      const response = await request(app.getHttpServer())
        .get(`/qr/assets/${assetId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        token: qrToken,
        assetId,
        isActive: true,
      });

      expect(response.body.asset).toMatchObject({
        id: assetId,
        ownerId,
        equipmentTypeId,
      });
    });

    // QR-009
    it('QR-009: should reject unauthenticated access', async () => {
      await request(app.getHttpServer())
        .get(`/qr/assets/${assetId}`)
        .expect(401);
    });

    // QR-010
    it('QR-010: should return 404 if the asset has no QR code', async () => {
      const response = await request(app.getHttpServer())
        .get(`/qr/assets/${otherAssetId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      expect(response.body.message).toBe('QR code not found for this asset');
    });
  });

  // ============================================================= //
  // DEACTIVATE
  // ============================================================= //

  describe('PATCH /qr/:token/deactivate', () => {
    // QR-011
    it('QR-011: should deactivate the QR code for its owner', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/qr/${qrToken}/deactivate`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        token: qrToken,
        isActive: false,
      });

      const qrCode = await prisma.qRCode.findUnique({
        where: {
          token: qrToken,
        },
      });

      expect(qrCode?.isActive).toBe(false);
    });

    // QR-012
    it('QR-012: should reject deactivation by another owner', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/qr/${qrToken}/deactivate`)
        .set('Authorization', `Bearer ${otherOwnerToken}`)
        .expect(403);

      expect(response.body.message).toBe(
        'You do not own the asset associated with this QR code',
      );

      const qrCode = await prisma.qRCode.findUnique({
        where: {
          token: qrToken,
        },
      });

      expect(qrCode?.isActive).toBe(false);
    });

    // QR-013
    it('QR-013: should reject unauthenticated deactivation', async () => {
      await request(app.getHttpServer())
        .patch(`/qr/${qrToken}/deactivate`)
        .expect(401);
    });
  });

  // ============================================================= //
  // VALIDATE INACTIVE QR
  // ============================================================= //

  describe('GET /qr/:token - inactive QR', () => {
    // QR-014
    it('QR-014: should reject an inactive QR code', async () => {
      const response = await request(app.getHttpServer())
        .get(`/qr/${qrToken}`)
        .expect(409);

      expect(response.body.message).toBe('QR code is inactive');
    });
  });

  // ============================================================= //
  // ACTIVATE
  // ============================================================= //

  describe('PATCH /qr/:token/activate', () => {
    // QR-015
    it('QR-015: should activate the QR code for its owner', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/qr/${qrToken}/activate`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        token: qrToken,
        isActive: true,
      });

      const qrCode = await prisma.qRCode.findUnique({
        where: {
          token: qrToken,
        },
      });

      expect(qrCode?.isActive).toBe(true);
    });

    // QR-016
    it('QR-016: should reject activation by another owner', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/qr/${qrToken}/activate`)
        .set('Authorization', `Bearer ${otherOwnerToken}`)
        .expect(403);

      expect(response.body.message).toBe(
        'You do not own the asset associated with this QR code',
      );

      const qrCode = await prisma.qRCode.findUnique({
        where: {
          token: qrToken,
        },
      });

      expect(qrCode?.isActive).toBe(true);
    });

    // QR-017
    it('QR-017: should reject unauthenticated activation', async () => {
      await request(app.getHttpServer())
        .patch(`/qr/${qrToken}/activate`)
        .expect(401);
    });
  });

  // ============================================================= //
  // REGENERATE
  // ============================================================= //

  describe('POST /qr/assets/:assetId/regenerate', () => {
    // QR-018
    it('QR-018: should regenerate the QR code for its owner', async () => {
      const oldToken = qrToken;

      const response = await request(app.getHttpServer())
        .post(`/qr/assets/${assetId}/regenerate`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        token: expect.any(String),
        url: expect.any(String),
        asset: {
          id: assetId,
          ownerId,
          equipmentTypeId,
        },
      });

      expect(response.body.token).not.toBe(oldToken);
      expect(response.body.token).toMatch(/^ATR_/);

      expect(response.body.url).toBe(
        `${process.env.QR_BASE_URL}/qr/${response.body.token}`,
      );

      qrToken = response.body.token;

      const qrCode = await prisma.qRCode.findUnique({
        where: {
          assetId,
        },
      });

      expect(qrCode).not.toBeNull();
      expect(qrCode?.token).toBe(qrToken);
      expect(qrCode?.isActive).toBe(true);
    });

    // QR-019
    it('QR-019: should invalidate the old token after regeneration', async () => {
      const currentQr = await prisma.qRCode.findUnique({
        where: {
          assetId,
        },
      });

      expect(currentQr).not.toBeNull();

      const oldToken = currentQr!.token;

      const response = await request(app.getHttpServer())
        .post(`/qr/assets/${assetId}/regenerate`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(201);

      const newToken = response.body.token;

      expect(newToken).not.toBe(oldToken);

      const oldTokenResponse = await request(app.getHttpServer())
        .get(`/qr/${oldToken}`)
        .expect(404);

      expect(oldTokenResponse.body.message).toBe('QR code not found');

      qrToken = newToken;

      const updatedQr = await prisma.qRCode.findUnique({
        where: {
          assetId,
        },
      });

      expect(updatedQr).not.toBeNull();
      expect(updatedQr?.token).toBe(newToken);
      expect(updatedQr?.isActive).toBe(true);
    });

    // QR-020
    it("QR-020: should reject regeneration by another owner's asset", async () => {
      const currentQr = await prisma.qRCode.findUnique({
        where: {
          assetId,
        },
      });

      expect(currentQr).not.toBeNull();

      const tokenBefore = currentQr!.token;

      const response = await request(app.getHttpServer())
        .post(`/qr/assets/${assetId}/regenerate`)
        .set('Authorization', `Bearer ${otherOwnerToken}`)
        .expect(403);

      expect(response.body.message).toBe('You do not own this asset.');

      const qrAfter = await prisma.qRCode.findUnique({
        where: {
          assetId,
        },
      });

      expect(qrAfter?.token).toBe(tokenBefore);
    });

    // QR-021
    it('QR-021: should reject unauthenticated regeneration', async () => {
      await request(app.getHttpServer())
        .post(`/qr/assets/${assetId}/regenerate`)
        .expect(401);
    });
  });
});
