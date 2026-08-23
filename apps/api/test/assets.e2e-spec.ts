import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import * as argon2 from 'argon2';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RoleName } from '../src/roles/enums/role-name.enum';
import { Event } from '../generated/prisma/enums';

describe('Assets E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testPassword = 'password123';

  const ownerEmail = `e2e-assets-owner-${Date.now()}@example.com`;
  const otherOwnerEmail = `e2e-assets-other-owner-${Date.now()}@example.com`;
  const technicianEmail = `e2e-assets-technician-${Date.now()}@example.com`;

  let ownerId: string;
  let otherOwnerId: string;
  let technicianId: string;

  let ownerToken: string;
  let technicianToken: string;

  let equipmentTypeId: string;
  let inactiveEquipmentTypeId: string;

  let ownerAssetId: string;
  let otherOwnerAssetId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();

    prisma = app.get(PrismaService);

    // ============================================================= //
    // TEST USERS
    // ============================================================= //

    const ownerRole = await prisma.role.findUnique({
      where: {
        name: RoleName.OWNER,
      },
    });

    const technicianRole = await prisma.role.findUnique({
      where: {
        name: RoleName.TECHNICIAN,
      },
    });

    if (!ownerRole) {
      throw new Error('OWNER role not found in test database.');
    }

    if (!technicianRole) {
      throw new Error('TECHNICIAN role not found in test database.');
    }

    const passwordHash = await argon2.hash(testPassword);

    const owner = await prisma.user.create({
      data: {
        email: ownerEmail,
        passwordHash,
        firstName: 'Asset',
        lastName: 'Owner',
        roles: {
          create: {
            roleId: ownerRole.id,
          },
        },
      },
    });

    const otherOwner = await prisma.user.create({
      data: {
        email: otherOwnerEmail,
        passwordHash,
        firstName: 'Other',
        lastName: 'Owner',
        roles: {
          create: {
            roleId: ownerRole.id,
          },
        },
      },
    });

    const technician = await prisma.user.create({
      data: {
        email: technicianEmail,
        passwordHash,
        firstName: 'Asset',
        lastName: 'Technician',
        roles: {
          create: {
            roleId: technicianRole.id,
          },
        },
      },
    });

    ownerId = owner.id;
    otherOwnerId = otherOwner.id;
    technicianId = technician.id;

    // ============================================================= //
    // LOGIN
    // ============================================================= //

    const ownerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: ownerEmail,
        password: testPassword,
      })
      .expect(200);

    ownerToken = ownerLogin.body.accessToken;

    const technicianLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: technicianEmail,
        password: testPassword,
      })
      .expect(200);

    technicianToken = technicianLogin.body.accessToken;

    // ============================================================= //
    // EQUIPMENT TYPES
    // ============================================================= //

    const equipmentType = await prisma.equipmentType.create({
      data: {
        name: `E2E Split Type ${Date.now()}`,
        description: 'Equipment type for Assets E2E tests',
        isActive: true,
      },
    });

    equipmentTypeId = equipmentType.id;

    const inactiveEquipmentType = await prisma.equipmentType.create({
      data: {
        name: `E2E Inactive Type ${Date.now()}`,
        description: 'Inactive equipment type for Assets E2E tests',
        isActive: false,
      },
    });

    inactiveEquipmentTypeId = inactiveEquipmentType.id;
  });

  afterAll(async () => {
    // Delete assets first because of relations.
    await prisma.asset.deleteMany({
      where: {
        ownerId: {
          in: [ownerId, otherOwnerId],
        },
      },
    });

    await prisma.equipmentType.deleteMany({
      where: {
        id: {
          in: [equipmentTypeId, inactiveEquipmentTypeId],
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: [ownerId, otherOwnerId, technicianId],
        },
      },
    });

    await app.close();
    await prisma.$disconnect();
  });

  // ============================================================= //
  // POST /assets
  // ============================================================= //

  describe('POST /assets', () => {
    // ASSET-001
    it('ASSET-001: should create a new asset', async () => {
      const serialNumber = `E2E-SERIAL-${Date.now()}`;

      const response = await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          brand: 'Daikin',
          model: 'FTKF35',
          serialNumber,
          equipmentTypeId,
          refrigerant: 'R32',
          capacity: 1.5,
          capacityUnit: 'HP',
          installationDate: '2026-08-01T00:00:00.000Z',
          location: 'Test Building',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        brand: 'Daikin',
        model: 'FTKF35',
        serialNumber,
        equipmentTypeId,
        refrigerant: 'R32',
        capacity: 1.5,
        capacityUnit: 'HP',
        location: 'Test Building',
        ownerId,
        isActive: true,
      });

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('equipmentType');

      ownerAssetId = response.body.id;

      const asset = await prisma.asset.findUnique({
        where: {
          id: ownerAssetId,
        },
      });

      expect(asset).not.toBeNull();
      expect(asset?.ownerId).toBe(ownerId);
      expect(asset?.serialNumber).toBe(serialNumber);
      expect(asset?.isActive).toBe(true);

      // Verify ASSET_CREATED audit log.
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          assetId: ownerAssetId,
          event: Event.ASSET_CREATED,
        },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog?.actorId).toBe(ownerId);
    });

    // ASSET-002
    it('ASSET-002: should create an asset without optional fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          brand: 'Mitsubishi',
          model: 'MSY-GR',
          equipmentTypeId,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        brand: 'Mitsubishi',
        model: 'MSY-GR',
        equipmentTypeId,
        ownerId,
        isActive: true,
      });

      await prisma.asset.delete({
        where: {
          id: response.body.id,
        },
      });
    });

    // ASSET-003
    it('ASSET-003: should reject an inactive equipment type', async () => {
      const response = await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          brand: 'Daikin',
          model: 'Inactive-Type',
          equipmentTypeId: inactiveEquipmentTypeId,
        })
        .expect(404);

      expect(response.body.message).toBe(
        'Equipment type not found or is inactive',
      );
    });

    // ASSET-004
    it('ASSET-004: should reject a nonexistent equipment type', async () => {
      const response = await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          brand: 'Daikin',
          model: 'Invalid-Type',
          equipmentTypeId: 'nonexistent-equipment-type',
        })
        .expect(404);

      expect(response.body.message).toBe(
        'Equipment type not found or is inactive',
      );
    });

    // ASSET-005
    it('ASSET-005: should reject a duplicate serial number', async () => {
      const asset = await prisma.asset.findUnique({
        where: {
          id: ownerAssetId,
        },
      });

      expect(asset?.serialNumber).toBeDefined();

      const response = await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          brand: 'LG',
          model: 'Duplicate',
          serialNumber: asset?.serialNumber,
          equipmentTypeId,
        })
        .expect(409);

      expect(response.body.message).toBe(
        'An asset with this serial number already exists',
      );
    });

    // ASSET-006
    it('ASSET-006: should reject creation without authentication', async () => {
      await request(app.getHttpServer())
        .post('/assets')
        .send({
          brand: 'Daikin',
          model: 'Unauthorized',
          equipmentTypeId,
        })
        .expect(401);
    });

    // ASSET-007
    it('ASSET-007: should reject creation by a non-OWNER user', async () => {
      const response = await request(app.getHttpServer())
        .post('/assets')
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({
          brand: 'Daikin',
          model: 'Technician',
          equipmentTypeId,
        })
        .expect(403);

      expect(response.body.message).toBe('Forbidden resource');
    });
  });

  // ============================================================= //
  // GET /assets
  // ============================================================= //

  describe('GET /assets', () => {
    // ASSET-008
    it('ASSET-008: should return assets owned by the authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .get('/assets')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);

      const asset = response.body.find(
        (item: { id: string }) => item.id === ownerAssetId,
      );

      expect(asset).toBeDefined();
      expect(asset.ownerId).toBe(ownerId);
      expect(asset).toHaveProperty('equipmentType');
      expect(asset).toHaveProperty('qrCode');
    });

    // ASSET-009
    it('ASSET-009: should not return assets owned by another user', async () => {
      const otherAsset = await prisma.asset.create({
        data: {
          brand: 'Other',
          model: 'Owner Asset',
          serialNumber: `OTHER-${Date.now()}`,
          equipmentTypeId,
          ownerId: otherOwnerId,
        },
      });

      otherOwnerAssetId = otherAsset.id;

      const response = await request(app.getHttpServer())
        .get('/assets')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(
        response.body.some(
          (item: { id: string }) => item.id === otherOwnerAssetId,
        ),
      ).toBe(false);
    });

    // ASSET-010
    it('ASSET-010: should reject listing without authentication', async () => {
      await request(app.getHttpServer()).get('/assets').expect(401);
    });

    // ASSET-011
    it('ASSET-011: should reject listing by a non-OWNER user', async () => {
      await request(app.getHttpServer())
        .get('/assets')
        .set('Authorization', `Bearer ${technicianToken}`)
        .expect(403);
    });
  });

  // ============================================================= //
  // GET /assets/:id
  // ============================================================= //

  describe('GET /assets/:id', () => {
    // ASSET-012
    it('ASSET-012: should return an owned asset', async () => {
      const response = await request(app.getHttpServer())
        .get(`/assets/${ownerAssetId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: ownerAssetId,
        ownerId,
        brand: 'Daikin',
        model: 'FTKF35',
      });

      expect(response.body).toHaveProperty('equipmentType');
      expect(response.body).toHaveProperty('qrCode');
      expect(response.body).toHaveProperty('serviceRecords');
      expect(response.body.serviceRecords).toBeInstanceOf(Array);
    });

    // ASSET-013
    it('ASSET-013: should reject access to another owner asset', async () => {
      const response = await request(app.getHttpServer())
        .get(`/assets/${otherOwnerAssetId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      expect(response.body.message).toBe('Asset not found');
    });

    // ASSET-014
    it('ASSET-014: should reject a nonexistent asset', async () => {
      const response = await request(app.getHttpServer())
        .get('/assets/nonexistent-asset-id')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      expect(response.body.message).toBe('Asset not found');
    });

    // ASSET-015
    it('ASSET-015: should reject access without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/assets/${ownerAssetId}`)
        .expect(401);
    });

    // ASSET-016
    it('ASSET-016: should reject access by a non-OWNER user', async () => {
      await request(app.getHttpServer())
        .get(`/assets/${ownerAssetId}`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .expect(403);
    });
  });

  // ============================================================= //
  // PATCH /assets/:id
  // ============================================================= //

  describe('PATCH /assets/:id', () => {
    // ASSET-017
    it('ASSET-017: should update an owned asset', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/assets/${ownerAssetId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          brand: 'Daikin Updated',
          model: 'FTKF35-UPDATED',
          refrigerant: 'R410A',
          capacity: 2,
          capacityUnit: 'TR',
          location: 'Updated Location',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: ownerAssetId,
        brand: 'Daikin Updated',
        model: 'FTKF35-UPDATED',
        refrigerant: 'R410A',
        capacity: 2,
        capacityUnit: 'TR',
        location: 'Updated Location',
        ownerId,
      });

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          assetId: ownerAssetId,
          event: Event.ASSET_UPDATED,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog?.actorId).toBe(ownerId);

      const payload = auditLog?.payload as {
        changes?: Record<string, unknown>;
      };

      expect(payload.changes).toHaveProperty('brand');
      expect(payload.changes).toHaveProperty('model');
      expect(payload.changes).toHaveProperty('refrigerant');
      expect(payload.changes).toHaveProperty('capacity');
      expect(payload.changes).toHaveProperty('capacityUnit');
      expect(payload.changes).toHaveProperty('location');
    });

    // ASSET-018
    it('ASSET-018: should update only the provided fields', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/assets/${ownerAssetId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          location: 'Partial Update Location',
        })
        .expect(200);

      expect(response.body.location).toBe('Partial Update Location');
      expect(response.body.brand).toBe('Daikin Updated');
      expect(response.body.model).toBe('FTKF35-UPDATED');
      expect(response.body.refrigerant).toBe('R410A');
    });

    // ASSET-019
    it('ASSET-019: should reject an inactive equipment type during update', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/assets/${ownerAssetId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          equipmentTypeId: inactiveEquipmentTypeId,
        })
        .expect(404);

      expect(response.body.message).toBe(
        'Equipment type not found or is inactive',
      );
    });

    // ASSET-020
    it('ASSET-020: should reject updating another owner asset', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/assets/${otherOwnerAssetId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          brand: 'Unauthorized Update',
        })
        .expect(404);

      expect(response.body.message).toBe('Asset not found');
    });

    // ASSET-021
    it('ASSET-021: should reject updating a nonexistent asset', async () => {
      const response = await request(app.getHttpServer())
        .patch('/assets/nonexistent-asset-id')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          brand: 'Not Found',
        })
        .expect(404);

      expect(response.body.message).toBe('Asset not found');
    });

    // ASSET-022
    it('ASSET-022: should reject a duplicate serial number during update', async () => {
      const otherAsset = await prisma.asset.findUnique({
        where: {
          id: otherOwnerAssetId,
        },
      });

      expect(otherAsset?.serialNumber).toBeDefined();

      const response = await request(app.getHttpServer())
        .patch(`/assets/${ownerAssetId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          serialNumber: otherAsset?.serialNumber,
        })
        .expect(409);

      expect(response.body.message).toBe(
        'An asset with this serial number already exists',
      );
    });

    // ASSET-023
    it('ASSET-023: should allow an empty partial update', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/assets/${ownerAssetId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({})
        .expect(200);

      expect(response.body.id).toBe(ownerAssetId);
    });

    // ASSET-024
    it('ASSET-024: should reject updating without authentication', async () => {
      await request(app.getHttpServer())
        .patch(`/assets/${ownerAssetId}`)
        .send({
          brand: 'Unauthorized',
        })
        .expect(401);
    });

    // ASSET-025
    it('ASSET-025: should reject updating by a non-OWNER user', async () => {
      await request(app.getHttpServer())
        .patch(`/assets/${ownerAssetId}`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .send({
          brand: 'Technician Update',
        })
        .expect(403);
    });
  });

  // ============================================================= //
  // PATCH /assets/:id/deactivate
  // ============================================================= //

  describe('PATCH /assets/:id/deactivate', () => {
    let deactivationAssetId: string;

    beforeAll(async () => {
      const asset = await prisma.asset.create({
        data: {
          brand: 'Deactivation',
          model: 'Test Asset',
          serialNumber: `DEACTIVATE-${Date.now()}`,
          equipmentTypeId,
          ownerId,
        },
      });

      deactivationAssetId = asset.id;
    });

    // ASSET-026
    it('ASSET-026: should deactivate an owned active asset', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/assets/${deactivationAssetId}/deactivate`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: deactivationAssetId,
        isActive: false,
      });

      const asset = await prisma.asset.findUnique({
        where: {
          id: deactivationAssetId,
        },
      });

      expect(asset?.isActive).toBe(false);

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          assetId: deactivationAssetId,
          event: Event.ASSET_DEACTIVATED,
        },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog?.actorId).toBe(ownerId);
      expect(auditLog?.payload).toEqual({
        previousStatus: true,
        newStatus: false,
      });
    });

    // ASSET-027
    it('ASSET-027: should reject deactivating an already inactive asset', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/assets/${deactivationAssetId}/deactivate`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      expect(response.body.message).toBe('Asset not found or already inactive');
    });

    // ASSET-028
    it('ASSET-028: should reject deactivating another owner asset', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/assets/${otherOwnerAssetId}/deactivate`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      expect(response.body.message).toBe('Asset not found or already inactive');
    });

    // ASSET-029
    it('ASSET-029: should reject deactivation without authentication', async () => {
      await request(app.getHttpServer())
        .patch(`/assets/${deactivationAssetId}/deactivate`)
        .expect(401);
    });

    // ASSET-030
    it('ASSET-030: should reject deactivation by a non-OWNER user', async () => {
      await request(app.getHttpServer())
        .patch(`/assets/${deactivationAssetId}/deactivate`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .expect(403);
    });
  });

  // ============================================================= //
  // DELETE /assets/:id
  // ============================================================= //

  describe('DELETE /assets/:id', () => {
    let removableAssetId: string;

    beforeAll(async () => {
      const asset = await prisma.asset.create({
        data: {
          brand: 'Delete',
          model: 'Test Asset',
          serialNumber: `DELETE-${Date.now()}`,
          equipmentTypeId,
          ownerId,
        },
      });

      removableAssetId = asset.id;
    });

    // ASSET-031
    it('ASSET-031: should delete an owned asset', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/assets/${removableAssetId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: removableAssetId,
        ownerId,
      });

      const asset = await prisma.asset.findUnique({
        where: {
          id: removableAssetId,
        },
      });

      expect(asset).toBeNull();
    });

    // ASSET-032
    it('ASSET-032: should reject deleting a nonexistent asset', async () => {
      const response = await request(app.getHttpServer())
        .delete('/assets/nonexistent-asset-id')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      expect(response.body.message).toBe('Asset not found');
    });

    // ASSET-033
    it('ASSET-033: should reject deleting another owner asset', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/assets/${otherOwnerAssetId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      expect(response.body.message).toBe('Asset not found');

      const asset = await prisma.asset.findUnique({
        where: {
          id: otherOwnerAssetId,
        },
      });

      expect(asset).not.toBeNull();
    });

    // ASSET-034
    it('ASSET-034: should reject deleting without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/assets/${otherOwnerAssetId}`)
        .expect(401);
    });

    // ASSET-035
    it('ASSET-035: should reject deleting by a non-OWNER user', async () => {
      await request(app.getHttpServer())
        .delete(`/assets/${otherOwnerAssetId}`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .expect(403);
    });
  });
});
