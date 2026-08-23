import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';

import { Event } from '../../generated/prisma/enums';

import { AuditService } from './audit.service';

import { CreateAuditLogInput } from './types/create-audit-log.type';

import { createHash } from 'crypto';

describe('AuditService', () => {
  let service: AuditService;

  const mockAuditLog = {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  };

  const mockPrisma = {
    auditLog: mockAuditLog,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('log', () => {
    const input: CreateAuditLogInput = {
      actorId: 'user-123',
      assetId: 'asset-123',
      event: Event.SERVICE_RECORD_CREATED,
      payload: {
        serviceRecordId: 'service-123',
      },
    };

    it('should create an audit log with the previous hash', async () => {
      const previousAudit = {
        id: 'audit-1',
        assetId: 'asset-123',
        hash: 'previous-hash',
        createdAt: new Date('2026-08-20T10:00:00.000Z'),
      };

      const createdAudit = {
        id: 'audit-2',
        ...input,
        previousHash: 'previous-hash',
        hash: 'generated-hash',
        createdAt: expect.any(Date),
      };

      mockAuditLog.findFirst.mockResolvedValue(previousAudit);
      mockAuditLog.create.mockResolvedValue(createdAudit);

      const result = await service.log(input);

      expect(mockAuditLog.findFirst).toHaveBeenCalledWith({
        where: {
          assetId: 'asset-123',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(mockAuditLog.create).toHaveBeenCalledTimes(1);

      const createCall = mockAuditLog.create.mock.calls[0][0];

      expect(createCall.data.actorId).toBe('user-123');
      expect(createCall.data.assetId).toBe('asset-123');
      expect(createCall.data.event).toBe(Event.SERVICE_RECORD_CREATED);
      expect(createCall.data.payload).toEqual({
        serviceRecordId: 'service-123',
      });

      expect(createCall.data.previousHash).toBe('previous-hash');
      expect(createCall.data.hash).toMatch(/^[a-f0-9]{64}$/);
      expect(createCall.data.createdAt).toEqual(expect.any(Date));

      expect(result).toEqual(createdAudit);
    });

    it('should use null as previousHash when there is no previous audit', async () => {
      mockAuditLog.findFirst.mockResolvedValue(null);

      const createdAudit = {
        id: 'audit-1',
        ...input,
        previousHash: null,
        hash: 'generated-hash',
        createdAt: expect.any(Date),
      };

      mockAuditLog.create.mockResolvedValue(createdAudit);

      await service.log(input);

      expect(mockAuditLog.findFirst).toHaveBeenCalledWith({
        where: {
          assetId: 'asset-123',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const createCall = mockAuditLog.create.mock.calls[0][0];

      expect(createCall.data.previousHash).toBeNull();
      expect(createCall.data.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle a missing actorId and payload', async () => {
      const inputWithoutOptionalFields: CreateAuditLogInput = {
        assetId: 'asset-123',
        event: Event.ASSET_CREATED,
      };

      mockAuditLog.findFirst.mockResolvedValue(null);

      mockAuditLog.create.mockResolvedValue({
        id: 'audit-1',
        ...inputWithoutOptionalFields,
      });

      await service.log(inputWithoutOptionalFields);

      const createCall = mockAuditLog.create.mock.calls[0][0];

      expect(createCall.data.actorId).toBeUndefined();
      expect(createCall.data.payload).toBeUndefined();
      expect(createCall.data.previousHash).toBeNull();
      expect(createCall.data.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate the correct SHA-256 hash', async () => {
      mockAuditLog.findFirst.mockResolvedValue({
        hash: 'previous-hash',
      });

      mockAuditLog.create.mockResolvedValue({
        id: 'audit-2',
      });

      const before = Date.now();

      await service.log(input);

      const after = Date.now();

      const createCall = mockAuditLog.create.mock.calls[0][0];

      const createdAt = createCall.data.createdAt as Date;

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(createdAt.getTime()).toBeLessThanOrEqual(after);

      const hashPayload = {
        actorId: input.actorId ?? null,
        assetId: input.assetId,
        event: input.event,
        payload: input.payload ?? null,
        previousHash: 'previous-hash',
        createdAt: createdAt.toISOString(),
      };

      const expectedHash = createHash('sha256')
        .update(JSON.stringify(hashPayload))
        .digest('hex');

      expect(createCall.data.hash).toBe(expectedHash);
    });

    it('should use the supplied transaction client when provided', async () => {
      const transactionCreate = jest.fn();

      const transactionClient = {
        auditLog: {
          create: transactionCreate,
        },
      };

      mockAuditLog.findFirst.mockResolvedValue(null);

      transactionCreate.mockResolvedValue({
        id: 'audit-1',
        ...input,
      });

      const result = await service.log(input, transactionClient as any);

      expect(mockAuditLog.findFirst).toHaveBeenCalled();

      expect(transactionCreate).toHaveBeenCalledTimes(1);

      expect(mockAuditLog.create).not.toHaveBeenCalled();

      expect(result).toEqual({
        id: 'audit-1',
        ...input,
      });
    });

    it('should propagate an error when finding the previous audit fails', async () => {
      const error = new Error('Database error');

      mockAuditLog.findFirst.mockRejectedValue(error);

      await expect(service.log(input)).rejects.toThrow(error);

      expect(mockAuditLog.create).not.toHaveBeenCalled();
    });

    it('should propagate an error when creating the audit log fails', async () => {
      const error = new Error('Database error');

      mockAuditLog.findFirst.mockResolvedValue(null);
      mockAuditLog.create.mockRejectedValue(error);

      await expect(service.log(input)).rejects.toThrow(error);
    });
  });

  describe('getAssetHistory', () => {
    it('should return audit history for an asset ordered by creation date ascending', async () => {
      const history = [
        {
          id: 'audit-1',
          assetId: 'asset-123',
          event: Event.ASSET_CREATED,
          createdAt: new Date('2026-08-20T10:00:00.000Z'),
        },
        {
          id: 'audit-2',
          assetId: 'asset-123',
          event: Event.SERVICE_RECORD_CREATED,
          createdAt: new Date('2026-08-21T10:00:00.000Z'),
        },
      ];

      mockAuditLog.findMany.mockResolvedValue(history);

      const result = await service.getAssetHistory('asset-123');

      expect(mockAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          assetId: 'asset-123',
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      expect(result).toEqual(history);
    });

    it('should return an empty array when the asset has no audit history', async () => {
      mockAuditLog.findMany.mockResolvedValue([]);

      const result = await service.getAssetHistory('asset-123');

      expect(mockAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          assetId: 'asset-123',
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      expect(result).toEqual([]);
    });

    it('should propagate an error when retrieving history fails', async () => {
      const error = new Error('Database error');

      mockAuditLog.findMany.mockRejectedValue(error);

      await expect(service.getAssetHistory('asset-123')).rejects.toThrow(error);
    });
  });
});
