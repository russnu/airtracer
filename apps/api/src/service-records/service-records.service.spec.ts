import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';

import { ServiceRecordsService } from './service-records.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Event, ServiceStatus } from '../../generated/prisma/enums';
import { CreateServiceRecordDto } from './dto/create-service-record.dto';
import { UpdateServiceRecordStatusDto } from './dto/update-service-record-status.dto';

describe('ServiceRecordsService', () => {
  let service: ServiceRecordsService;

  const prismaMock = {
    asset: {
      findUnique: jest.fn(),
    },
    serviceRecord: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const auditServiceMock = {
    log: jest.fn(),
  };

  const txMock = {
    serviceRecord: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const assetId = 'asset-1';
  const technicianId = 'technician-1';
  const serviceRecordId = 'service-record-1';

  const asset = {
    id: assetId,
    brand: 'Daikin',
    model: 'FTKF35',
    serialNumber: 'SN-001',
    isActive: true,
    equipmentTypeId: 'equipment-type-1',
    refrigerant: 'R-32',
    capacity: 1.5,
    capacityUnit: 'HP',
    installationDate: new Date('2026-01-01T00:00:00.000Z'),
    location: 'Room 101',
    ownerId: 'owner-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const serviceRecord = {
    id: serviceRecordId,
    assetId,
    technicianId,
    serviceDate: new Date('2026-08-20T00:00:00.000Z'),
    serviceType: 'Preventive Maintenance',
    description: 'Routine maintenance',
    status: ServiceStatus.PENDING,
    suctionPressure: 70,
    dischargePressure: 250,
    current: 5.2,
    voltage: 220,
    returnAirTemp: 25,
    supplyAirTemp: 15,
    findings: 'Unit is operating normally',
    recommendations: 'Continue regular maintenance',
    clientRequestId: null as string | null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback(txMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceRecordsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: AuditService,
          useValue: auditServiceMock,
        },
      ],
    }).compile();

    service = module.get<ServiceRecordsService>(ServiceRecordsService);
  });

  //==========================================================================//
  // create
  //==========================================================================//

  describe('create', () => {
    const createDto: CreateServiceRecordDto = {
      serviceDate: '2026-08-20T00:00:00.000Z',
      serviceType: 'Preventive Maintenance',
      description: 'Routine maintenance',
      suctionPressure: 70,
      dischargePressure: 250,
      current: 5.2,
      voltage: 220,
      returnAirTemp: 25,
      supplyAirTemp: 15,
      findings: 'Unit is operating normally',
      recommendations: 'Continue regular maintenance',
    };

    it('should create a service record and log the event', async () => {
      prismaMock.asset.findUnique.mockResolvedValue(asset);
      txMock.serviceRecord.create.mockResolvedValue(serviceRecord);

      const result = await service.create(assetId, technicianId, createDto);

      expect(prismaMock.asset.findUnique).toHaveBeenCalledWith({
        where: {
          id: assetId,
        },
      });

      expect(txMock.serviceRecord.create).toHaveBeenCalledWith({
        data: {
          clientRequestId: undefined,
          assetId,
          technicianId,
          serviceDate: new Date(createDto.serviceDate),
          serviceType: createDto.serviceType,
          description: createDto.description,
          suctionPressure: createDto.suctionPressure,
          dischargePressure: createDto.dischargePressure,
          current: createDto.current,
          voltage: createDto.voltage,
          returnAirTemp: createDto.returnAirTemp,
          supplyAirTemp: createDto.supplyAirTemp,
          findings: createDto.findings,
          recommendations: createDto.recommendations,
        },
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        {
          actorId: technicianId,
          assetId,
          event: Event.SERVICE_RECORD_CREATED,
          payload: {
            serviceRecordId: serviceRecord.id,
            serviceDate: serviceRecord.serviceDate.toISOString(),
            serviceType: serviceRecord.serviceType,
            description: serviceRecord.description,
            status: serviceRecord.status,
            suctionPressure: serviceRecord.suctionPressure,
            dischargePressure: serviceRecord.dischargePressure,
            current: serviceRecord.current,
            voltage: serviceRecord.voltage,
            returnAirTemp: serviceRecord.returnAirTemp,
            supplyAirTemp: serviceRecord.supplyAirTemp,
            findings: serviceRecord.findings,
            recommendations: serviceRecord.recommendations,
            clientRequestId: null,
            clientCapturedAt: null,
          },
        },
        txMock,
      );

      expect(result).toEqual(serviceRecord);
    });

    describe('with a clientRequestId', () => {
      const clientRequestId = '1b4e28ba-2fa1-4d3b-9c5a-6f0e3b2a9d11';
      const idempotentDto: CreateServiceRecordDto = {
        ...createDto,
        clientRequestId,
        clientCapturedAt: '2026-08-20T08:30:00.000Z',
      };
      const storedRecord = { ...serviceRecord, clientRequestId };

      it('should store the key and record the capture time in the audit log', async () => {
        prismaMock.serviceRecord.findUnique.mockResolvedValue(null);
        prismaMock.asset.findUnique.mockResolvedValue(asset);
        txMock.serviceRecord.create.mockResolvedValue(storedRecord);

        await service.create(assetId, technicianId, idempotentDto);

        expect(txMock.serviceRecord.create).toHaveBeenCalledWith({
          data: expect.objectContaining({ clientRequestId }),
        });
        expect(auditServiceMock.log).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: expect.objectContaining({
              clientRequestId,
              clientCapturedAt: '2026-08-20T08:30:00.000Z',
            }),
          }),
          txMock,
        );
      });

      it('should return the stored record on a replay without creating another', async () => {
        prismaMock.serviceRecord.findUnique.mockResolvedValue(storedRecord);

        const result = await service.create(
          assetId,
          technicianId,
          idempotentDto,
        );

        expect(result).toEqual(storedRecord);
        expect(prismaMock.serviceRecord.findUnique).toHaveBeenCalledWith({
          where: { clientRequestId },
        });
        // Checked before the asset, so a replay succeeds even if the asset
        // was deactivated after the record was first stored.
        expect(prismaMock.asset.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.$transaction).not.toHaveBeenCalled();
      });

      it('should reject a key already used by another technician', async () => {
        prismaMock.serviceRecord.findUnique.mockResolvedValue({
          ...storedRecord,
          technicianId: 'technician-2',
        });

        await expect(
          service.create(assetId, technicianId, idempotentDto),
        ).rejects.toThrow(ConflictException);
        expect(prismaMock.$transaction).not.toHaveBeenCalled();
      });

      it('should reject a key already used for another asset', async () => {
        prismaMock.serviceRecord.findUnique.mockResolvedValue({
          ...storedRecord,
          assetId: 'asset-2',
        });

        await expect(
          service.create(assetId, technicianId, idempotentDto),
        ).rejects.toThrow(ConflictException);
      });

      it('should return the winning record when a concurrent request stored it first', async () => {
        prismaMock.serviceRecord.findUnique
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(storedRecord);
        prismaMock.asset.findUnique.mockResolvedValue(asset);
        prismaMock.$transaction.mockRejectedValueOnce(
          new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: 'test',
          }),
        );

        const result = await service.create(
          assetId,
          technicianId,
          idempotentDto,
        );

        expect(result).toEqual(storedRecord);
      });
    });

    it('should throw NotFoundException when the asset does not exist', async () => {
      prismaMock.asset.findUnique.mockResolvedValue(null);

      await expect(
        service.create(assetId, technicianId, createDto),
      ).rejects.toThrow(new NotFoundException('Asset not found.'));

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(auditServiceMock.log).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when the asset is inactive', async () => {
      prismaMock.asset.findUnique.mockResolvedValue({
        ...asset,
        isActive: false,
      });

      await expect(
        service.create(assetId, technicianId, createDto),
      ).rejects.toThrow(
        new BadRequestException(
          'Cannot create a service record for an inactive asset.',
        ),
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(auditServiceMock.log).not.toHaveBeenCalled();
    });
  });

  //==========================================================================//
  // findOne
  //==========================================================================//

  describe('findOne', () => {
    it('should return the service record', async () => {
      prismaMock.serviceRecord.findUnique.mockResolvedValue(serviceRecord);

      const result = await service.findOne(serviceRecordId);

      expect(prismaMock.serviceRecord.findUnique).toHaveBeenCalledWith({
        where: {
          id: serviceRecordId,
        },
      });

      expect(result).toEqual(serviceRecord);
    });

    it('should throw NotFoundException when the service record does not exist', async () => {
      prismaMock.serviceRecord.findUnique.mockResolvedValue(null);

      await expect(service.findOne(serviceRecordId)).rejects.toThrow(
        new NotFoundException('Service record not found'),
      );
    });
  });

  //==========================================================================//
  // findByAsset
  //==========================================================================//

  describe('findByAsset', () => {
    it('should return service records for the asset ordered by service date', async () => {
      const serviceRecords = [
        serviceRecord,
        {
          ...serviceRecord,
          id: 'service-record-2',
          serviceDate: new Date('2026-07-20T00:00:00.000Z'),
        },
      ];

      prismaMock.asset.findUnique.mockResolvedValue(asset);
      prismaMock.serviceRecord.findMany.mockResolvedValue(serviceRecords);

      const result = await service.findByAsset(assetId);

      expect(prismaMock.asset.findUnique).toHaveBeenCalledWith({
        where: {
          id: assetId,
        },
      });

      expect(prismaMock.serviceRecord.findMany).toHaveBeenCalledWith({
        where: {
          assetId,
        },
        orderBy: {
          serviceDate: 'desc',
        },
      });

      expect(result).toEqual(serviceRecords);
    });

    it('should throw NotFoundException when the asset does not exist', async () => {
      prismaMock.asset.findUnique.mockResolvedValue(null);

      await expect(service.findByAsset(assetId)).rejects.toThrow(
        new NotFoundException('Asset not found.'),
      );

      expect(prismaMock.serviceRecord.findMany).not.toHaveBeenCalled();
    });
  });

  //==========================================================================//
  // updateStatus
  //==========================================================================//

  describe('updateStatus', () => {
    it('should update the status to COMPLETED and create a completion audit log', async () => {
      const dto: UpdateServiceRecordStatusDto = {
        status: ServiceStatus.COMPLETED,
      };

      const updatedRecord = {
        ...serviceRecord,
        status: ServiceStatus.COMPLETED,
      };

      prismaMock.serviceRecord.findUnique.mockResolvedValue(serviceRecord);

      txMock.serviceRecord.update.mockResolvedValue(updatedRecord);

      const result = await service.updateStatus(
        serviceRecordId,
        technicianId,
        dto,
      );

      expect(prismaMock.serviceRecord.findUnique).toHaveBeenCalledWith({
        where: {
          id: serviceRecordId,
        },
      });

      expect(txMock.serviceRecord.update).toHaveBeenCalledWith({
        where: {
          id: serviceRecordId,
        },
        data: {
          status: ServiceStatus.COMPLETED,
        },
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        {
          actorId: technicianId,
          assetId: serviceRecord.assetId,
          event: Event.SERVICE_RECORD_COMPLETED,
          payload: {
            serviceRecordId: serviceRecord.id,
            changes: {
              status: {
                from: ServiceStatus.PENDING,
                to: ServiceStatus.COMPLETED,
              },
            },
          },
        },
        txMock,
      );

      expect(result).toEqual(updatedRecord);
    });

    it('should update the status to CANCELLED and create a cancellation audit log', async () => {
      const dto: UpdateServiceRecordStatusDto = {
        status: ServiceStatus.CANCELLED,
      };

      const updatedRecord = {
        ...serviceRecord,
        status: ServiceStatus.CANCELLED,
      };

      prismaMock.serviceRecord.findUnique.mockResolvedValue(serviceRecord);

      txMock.serviceRecord.update.mockResolvedValue(updatedRecord);

      const result = await service.updateStatus(
        serviceRecordId,
        technicianId,
        dto,
      );

      expect(txMock.serviceRecord.update).toHaveBeenCalledWith({
        where: {
          id: serviceRecordId,
        },
        data: {
          status: ServiceStatus.CANCELLED,
        },
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        {
          actorId: technicianId,
          assetId: serviceRecord.assetId,
          event: Event.SERVICE_RECORD_CANCELLED,
          payload: {
            serviceRecordId: serviceRecord.id,
            changes: {
              status: {
                from: ServiceStatus.PENDING,
                to: ServiceStatus.CANCELLED,
              },
            },
          },
        },
        txMock,
      );

      expect(result).toEqual(updatedRecord);
    });

    it('should use SERVICE_RECORD_UPDATED for other status changes', async () => {
      const dto: UpdateServiceRecordStatusDto = {
        status: ServiceStatus.IN_PROGRESS,
      };

      const updatedRecord = {
        ...serviceRecord,
        status: ServiceStatus.IN_PROGRESS,
      };

      prismaMock.serviceRecord.findUnique.mockResolvedValue(serviceRecord);

      txMock.serviceRecord.update.mockResolvedValue(updatedRecord);

      await service.updateStatus(serviceRecordId, technicianId, dto);

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        {
          actorId: technicianId,
          assetId: serviceRecord.assetId,
          event: Event.SERVICE_RECORD_UPDATED,
          payload: {
            serviceRecordId: serviceRecord.id,
            changes: {
              status: {
                from: ServiceStatus.PENDING,
                to: ServiceStatus.IN_PROGRESS,
              },
            },
          },
        },
        txMock,
      );
    });

    it('should throw NotFoundException when the service record does not exist', async () => {
      const dto: UpdateServiceRecordStatusDto = {
        status: ServiceStatus.COMPLETED,
      };

      prismaMock.serviceRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus(serviceRecordId, technicianId, dto),
      ).rejects.toThrow(new NotFoundException('Service record not found'));

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(auditServiceMock.log).not.toHaveBeenCalled();
    });

    it('should not update or create an audit log when the status is unchanged', async () => {
      const dto: UpdateServiceRecordStatusDto = {
        status: ServiceStatus.PENDING,
      };

      prismaMock.serviceRecord.findUnique.mockResolvedValue(serviceRecord);

      const result = await service.updateStatus(
        serviceRecordId,
        technicianId,
        dto,
      );

      expect(result).toEqual(serviceRecord);

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(txMock.serviceRecord.update).not.toHaveBeenCalled();
      expect(auditServiceMock.log).not.toHaveBeenCalled();
    });
  });
});
