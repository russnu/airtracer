import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RoleName } from '../src/roles/enums/role-name.enum';

describe('Service records and photos E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testPassword = 'password123';
  const runId = Date.now();

  let ownerToken: string;
  let otherOwnerToken: string;
  let technicianToken: string;
  let technicianId: string;
  let otherTechnicianToken: string;

  const userIds: string[] = [];
  let equipmentTypeId: string;
  let assetId: string;
  let inactiveAssetId: string;

  const baseRecord = {
    serviceDate: '2026-10-20T00:00:00.000Z',
    serviceType: 'Preventive Maintenance',
    description: 'E2E service record',
    suctionPressure: 70,
  };

  async function register(role: RoleName, label: string) {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: `e2e-sr-${label}-${runId}@example.com`,
        password: testPassword,
        firstName: 'Service',
        lastName: label,
        role,
      })
      .expect(201);

    userIds.push(response.body.user.id);
    return {
      token: response.body.accessToken as string,
      id: response.body.user.id as string,
    };
  }

  function createRecord(token: string, targetAssetId: string, body: object) {
    return request(app.getHttpServer())
      .post(`/assets/${targetAssetId}/service-records`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

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

    const equipmentType = await prisma.equipmentType.create({
      data: { name: `E2E Service Record Equipment ${runId}` },
    });
    equipmentTypeId = equipmentType.id;

    const owner = await register(RoleName.OWNER, 'owner');
    ownerToken = owner.token;
    otherOwnerToken = (await register(RoleName.OWNER, 'owner2')).token;
    const technician = await register(RoleName.TECHNICIAN, 'tech');
    technicianToken = technician.token;
    technicianId = technician.id;
    otherTechnicianToken = (await register(RoleName.TECHNICIAN, 'tech2')).token;

    const asset = await prisma.asset.create({
      data: {
        brand: 'Daikin',
        model: 'FTKF35',
        serialNumber: `E2E-SR-${runId}`,
        ownerId: owner.id,
        equipmentTypeId,
      },
    });
    assetId = asset.id;

    const inactiveAsset = await prisma.asset.create({
      data: {
        brand: 'Carrier',
        model: 'X-Power',
        serialNumber: `E2E-SR-INACTIVE-${runId}`,
        ownerId: owner.id,
        equipmentTypeId,
        isActive: false,
      },
    });
    inactiveAssetId = inactiveAsset.id;
  });

  // ============================================================= //
  // CLEANUP
  // ============================================================= //

  afterAll(async () => {
    const assetIds = [assetId, inactiveAssetId].filter(Boolean);

    await prisma.serviceRecord.deleteMany({
      where: { assetId: { in: assetIds } },
    });
    // Audit logs cascade with the asset.
    await prisma.asset.deleteMany({ where: { id: { in: assetIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    if (equipmentTypeId) {
      await prisma.equipmentType.delete({ where: { id: equipmentTypeId } });
    }

    await app.close();
    await prisma.$disconnect();
  });

  // ============================================================= //
  // VALIDATION
  // ============================================================= //

  describe('request validation', () => {
    it('SR-001: should reject a measurement sent as a string', async () => {
      await createRecord(technicianToken, assetId, {
        ...baseRecord,
        suctionPressure: '70',
      }).expect(400);
    });

    it('SR-002: should reject unknown fields', async () => {
      await createRecord(technicianToken, assetId, {
        ...baseRecord,
        technicianId: 'someone-else',
      }).expect(400);
    });

    it('SR-003: should reject a clientRequestId that is not a UUID v4', async () => {
      await createRecord(technicianToken, assetId, {
        ...baseRecord,
        clientRequestId: 'not-a-uuid',
      }).expect(400);
    });
  });

  // ============================================================= //
  // IDEMPOTENCY
  // ============================================================= //

  describe('POST /assets/:assetId/service-records with clientRequestId', () => {
    it('SR-010: should store one record when the same request is sent twice', async () => {
      const clientRequestId = randomUUID();
      const body = { ...baseRecord, clientRequestId };

      const first = await createRecord(technicianToken, assetId, body).expect(
        201,
      );
      const second = await createRecord(technicianToken, assetId, body).expect(
        201,
      );

      expect(second.body.id).toBe(first.body.id);
      expect(
        await prisma.serviceRecord.count({ where: { clientRequestId } }),
      ).toBe(1);
    });

    it('SR-011: should store one record when the same request races', async () => {
      const clientRequestId = randomUUID();
      const body = { ...baseRecord, clientRequestId };

      const responses = await Promise.all([
        createRecord(technicianToken, assetId, body),
        createRecord(technicianToken, assetId, body),
      ]);

      expect(responses.map((response) => response.status)).toEqual([201, 201]);
      expect(responses[0].body.id).toBe(responses[1].body.id);
      expect(
        await prisma.serviceRecord.count({ where: { clientRequestId } }),
      ).toBe(1);
    });

    it('SR-012: should reject a key reused by another technician', async () => {
      const clientRequestId = randomUUID();
      const body = { ...baseRecord, clientRequestId };

      await createRecord(technicianToken, assetId, body).expect(201);
      await createRecord(otherTechnicianToken, assetId, body).expect(409);
    });

    it('SR-013: should return the stored record after the asset is deactivated', async () => {
      const clientRequestId = randomUUID();
      const body = { ...baseRecord, clientRequestId };

      const first = await createRecord(technicianToken, assetId, body).expect(
        201,
      );

      await prisma.asset.update({
        where: { id: assetId },
        data: { isActive: false },
      });
      try {
        const replay = await createRecord(
          technicianToken,
          assetId,
          body,
        ).expect(201);
        expect(replay.body.id).toBe(first.body.id);

        // A new key for the inactive asset is still rejected.
        await createRecord(technicianToken, assetId, {
          ...baseRecord,
          clientRequestId: randomUUID(),
        }).expect(400);
      } finally {
        await prisma.asset.update({
          where: { id: assetId },
          data: { isActive: true },
        });
      }
    });

    it('SR-014: should reject a new record for an inactive asset', async () => {
      await createRecord(technicianToken, inactiveAssetId, {
        ...baseRecord,
        clientRequestId: randomUUID(),
      }).expect(400);
    });

    it('SR-015: should record the client capture time in the audit log', async () => {
      const clientRequestId = randomUUID();
      const clientCapturedAt = '2026-10-20T08:15:00.000Z';

      const response = await createRecord(technicianToken, assetId, {
        ...baseRecord,
        clientRequestId,
        clientCapturedAt,
      }).expect(201);

      const audit = await prisma.auditLog.findFirst({
        where: {
          assetId,
          event: 'SERVICE_RECORD_CREATED',
          payload: { path: ['serviceRecordId'], equals: response.body.id },
        },
      });

      expect(audit?.payload).toMatchObject({
        clientRequestId,
        clientCapturedAt,
      });
    });
  });

  // ============================================================= //
  // AUDIT CHAIN
  // ============================================================= //

  describe('audit hash chain', () => {
    it('SR-020: should stay linear when records for one asset are created concurrently', async () => {
      await Promise.all(
        Array.from({ length: 10 }, () =>
          createRecord(technicianToken, assetId, {
            ...baseRecord,
            clientRequestId: randomUUID(),
          }).expect(201),
        ),
      );

      const entries = await prisma.auditLog.findMany({
        where: { assetId },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });

      expect(entries.length).toBeGreaterThanOrEqual(10);
      expect(entries[0].previousHash).toBeNull();
      for (let index = 1; index < entries.length; index += 1) {
        expect(entries[index].previousHash).toBe(entries[index - 1].hash);
      }

      const previousHashes = entries.map((entry) => entry.previousHash);
      expect(new Set(previousHashes).size).toBe(previousHashes.length);
    });
  });

  // ============================================================= //
  // PHOTO AUTHORIZATION
  // ============================================================= //

  describe('service photo authorization', () => {
    let serviceRecordId: string;

    // A tiny payload with a valid JPEG signature.
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

    beforeAll(async () => {
      const response = await createRecord(technicianToken, assetId, {
        ...baseRecord,
        clientRequestId: randomUUID(),
      }).expect(201);
      serviceRecordId = response.body.id;
    });

    it('PH-001: should let the asset owner past the upload authorization check', async () => {
      // A disallowed file is rejected after authorization, so a 400 (not 403)
      // shows the owner may upload without writing to storage.
      await request(app.getHttpServer())
        .post(`/service-photo/${serviceRecordId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from('<svg></svg>'), {
          filename: 'a.svg',
          contentType: 'image/svg+xml',
        })
        .expect(400);
    });

    it('PH-006: should reject an upload by an owner of a different asset', async () => {
      await request(app.getHttpServer())
        .post(`/service-photo/${serviceRecordId}`)
        .set('Authorization', `Bearer ${otherOwnerToken}`)
        .attach('file', jpeg, { filename: 'a.jpg', contentType: 'image/jpeg' })
        .expect(403);
    });

    it('PH-002: should reject an upload by another technician', async () => {
      await request(app.getHttpServer())
        .post(`/service-photo/${serviceRecordId}`)
        .set('Authorization', `Bearer ${otherTechnicianToken}`)
        .attach('file', jpeg, { filename: 'a.jpg', contentType: 'image/jpeg' })
        .expect(403);
    });

    it('PH-003: should reject a file that is not an allowed image', async () => {
      await request(app.getHttpServer())
        .post(`/service-photo/${serviceRecordId}`)
        .set('Authorization', `Bearer ${technicianToken}`)
        .attach('file', Buffer.from('<svg></svg>'), {
          filename: 'a.svg',
          contentType: 'image/svg+xml',
        })
        .expect(400);
    });

    it('PH-004: should let the asset owner list photos', async () => {
      const response = await request(app.getHttpServer())
        .get(`/service-photo/${serviceRecordId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('PH-005: should let any technician or owner list photos', async () => {
      for (const token of [otherTechnicianToken, otherOwnerToken]) {
        await request(app.getHttpServer())
          .get(`/service-photo/${serviceRecordId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
      }
    });
  });

  // ============================================================= //
  // READ ACCESS
  // ============================================================= //

  interface RecordBody {
    id: string;
    technicianId: string;
    status: string;
    photoCount?: number;
    asset?: { id: string; brand: string };
  }

  async function createRecordId() {
    const response = await createRecord(technicianToken, assetId, {
      ...baseRecord,
      clientRequestId: randomUUID(),
    }).expect(201);
    return (response.body as RecordBody).id;
  }

  describe('service record read access', () => {
    let serviceRecordId: string;

    beforeAll(async () => {
      serviceRecordId = await createRecordId();
    });

    it('RD-001: should let any owner or technician read a record with its asset', async () => {
      for (const token of [ownerToken, otherOwnerToken, otherTechnicianToken]) {
        const response = await request(app.getHttpServer())
          .get(`/service-records/${serviceRecordId}`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);
        expect((response.body as RecordBody).asset).toMatchObject({
          id: assetId,
        });
      }
    });

    it('RD-002: should let a technician list an asset’s records', async () => {
      await request(app.getHttpServer())
        .get(`/assets/${assetId}/service-records`)
        .set('Authorization', `Bearer ${otherTechnicianToken}`)
        .expect(200);
    });

    it('RD-003: should list only the caller’s records on /service-records/mine', async () => {
      const response = await request(app.getHttpServer())
        .get('/service-records/mine')
        .set('Authorization', `Bearer ${technicianToken}`)
        .expect(200);

      const records = response.body as RecordBody[];
      expect(records.length).toBeGreaterThan(0);
      for (const record of records) {
        expect(record.technicianId).toBe(technicianId);
        expect(typeof record.photoCount).toBe('number');
        expect(record.asset).toHaveProperty('brand');
      }
      expect(records.some((record) => record.id === serviceRecordId)).toBe(
        true,
      );

      const other = await request(app.getHttpServer())
        .get('/service-records/mine')
        .set('Authorization', `Bearer ${otherTechnicianToken}`)
        .expect(200);
      expect(
        (other.body as RecordBody[]).some(
          (record) => record.id === serviceRecordId,
        ),
      ).toBe(false);
    });

    it('RD-004: should reject /service-records/mine for an owner', async () => {
      await request(app.getHttpServer())
        .get('/service-records/mine')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });
  });

  // ============================================================= //
  // STATUS CHANGES
  // ============================================================= //

  describe('PATCH /service-records/:id/status', () => {
    let serviceRecordId: string;

    function setStatus(token: string, status: string) {
      return request(app.getHttpServer())
        .patch(`/service-records/${serviceRecordId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status });
    }

    beforeAll(async () => {
      serviceRecordId = await createRecordId();
    });

    it('ST-001: should reject a change by another technician', async () => {
      await setStatus(otherTechnicianToken, 'IN_PROGRESS').expect(403);
    });

    it('ST-002: should reject a change by an owner', async () => {
      await setStatus(ownerToken, 'IN_PROGRESS').expect(403);
    });

    it('ST-003: should reject skipping from PENDING to COMPLETED', async () => {
      await setStatus(technicianToken, 'COMPLETED').expect(400);
    });

    it('ST-004: should follow PENDING -> IN_PROGRESS -> COMPLETED and then stay final', async () => {
      await setStatus(technicianToken, 'IN_PROGRESS').expect(200);
      const completed = await setStatus(technicianToken, 'COMPLETED').expect(
        200,
      );
      expect((completed.body as RecordBody).status).toBe('COMPLETED');

      await setStatus(technicianToken, 'CANCELLED').expect(400);
      await setStatus(technicianToken, 'IN_PROGRESS').expect(400);
    });
  });
});
