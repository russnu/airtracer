import { Test, TestingModule } from '@nestjs/testing';

import { ServiceRecordsController } from './service-records.controller';
import { ServiceRecordsService } from './service-records.service';
import { CreateServiceRecordDto } from './dto/create-service-record.dto';
import { UpdateServiceRecordStatusDto } from './dto/update-service-record-status.dto';
import { ServiceStatus } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

describe('ServiceRecordsController', () => {
  let controller: ServiceRecordsController;

  const serviceRecordServiceMock = {
    create: jest.fn(),
    findOne: jest.fn(),
    findByAsset: jest.fn(),
    findByTechnician: jest.fn(),
    updateStatus: jest.fn(),
  };

  const assetId = 'asset-1';
  const serviceRecordId = 'service-record-1';
  const technicianId = 'technician-1';

  const user: AuthenticatedUser = {
    id: technicianId,
    email: 'technician@example.com',
    firstName: 'John',
    lastName: 'Technician',
    phoneNumber: null,
    isVerified: true,
    isActive: true,
    lastLoginAt: null,
    passwordChangedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [
      {
        role: {
          id: 'role-1',
          name: 'TECHNICIAN',
          description: 'Technician role',
        },
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceRecordsController],
      providers: [
        {
          provide: ServiceRecordsService,
          useValue: serviceRecordServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ServiceRecordsController>(ServiceRecordsController);
  });

  //==========================================================================//
  // create
  //==========================================================================//

  describe('create', () => {
    const dto: CreateServiceRecordDto = {
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

    const createdServiceRecord = {
      id: serviceRecordId,
      assetId,
      technicianId,
      serviceDate: new Date(dto.serviceDate),
      serviceType: dto.serviceType,
      description: dto.description,
      status: ServiceStatus.PENDING,
      suctionPressure: dto.suctionPressure,
      dischargePressure: dto.dischargePressure,
      current: dto.current,
      voltage: dto.voltage,
      returnAirTemp: dto.returnAirTemp,
      supplyAirTemp: dto.supplyAirTemp,
      findings: dto.findings,
      recommendations: dto.recommendations,
    };

    it('should create a service record using the asset ID, authenticated user ID, and DTO', async () => {
      serviceRecordServiceMock.create.mockResolvedValue(createdServiceRecord);

      const result = await controller.create(assetId, user, dto);

      expect(serviceRecordServiceMock.create).toHaveBeenCalledWith(
        assetId,
        user.id,
        dto,
      );

      expect(result).toEqual(createdServiceRecord);
    });
  });

  //==========================================================================//
  // findMine
  //==========================================================================//

  describe('findMine', () => {
    it("should return the authenticated technician's records", async () => {
      const serviceRecords = [{ id: serviceRecordId, technicianId }];
      serviceRecordServiceMock.findByTechnician.mockResolvedValue(
        serviceRecords,
      );

      const result = await controller.findMine(user);

      expect(serviceRecordServiceMock.findByTechnician).toHaveBeenCalledWith(
        user.id,
      );
      expect(result).toEqual(serviceRecords);
    });
  });

  //==========================================================================//
  // findOne
  //==========================================================================//

  describe('findOne', () => {
    it('should return a service record by ID', async () => {
      const serviceRecord = {
        id: serviceRecordId,
        assetId,
        technicianId,
        serviceDate: new Date('2026-08-20T00:00:00.000Z'),
        serviceType: 'Preventive Maintenance',
        description: 'Routine maintenance',
        status: ServiceStatus.PENDING,
      };

      serviceRecordServiceMock.findOne.mockResolvedValue(serviceRecord);

      const result = await controller.findOne(serviceRecordId);

      expect(serviceRecordServiceMock.findOne).toHaveBeenCalledWith(
        serviceRecordId,
      );

      expect(result).toEqual(serviceRecord);
    });
  });

  //==========================================================================//
  // findByAsset
  //==========================================================================//

  describe('findByAsset', () => {
    it('should return service records belonging to an asset', async () => {
      const serviceRecords = [
        {
          id: serviceRecordId,
          assetId,
          technicianId,
          serviceDate: new Date('2026-08-20T00:00:00.000Z'),
          serviceType: 'Preventive Maintenance',
          status: ServiceStatus.PENDING,
        },
        {
          id: 'service-record-2',
          assetId,
          technicianId,
          serviceDate: new Date('2026-07-20T00:00:00.000Z'),
          serviceType: 'Repair',
          status: ServiceStatus.COMPLETED,
        },
      ];

      serviceRecordServiceMock.findByAsset.mockResolvedValue(serviceRecords);

      const result = await controller.findByAsset(assetId);

      expect(serviceRecordServiceMock.findByAsset).toHaveBeenCalledWith(
        assetId,
      );

      expect(result).toEqual(serviceRecords);
    });
  });

  //==========================================================================//
  // updateStatus
  //==========================================================================//

  describe('updateStatus', () => {
    const dto: UpdateServiceRecordStatusDto = {
      status: ServiceStatus.COMPLETED,
    };

    const updatedServiceRecord = {
      id: serviceRecordId,
      assetId,
      technicianId,
      serviceDate: new Date('2026-08-20T00:00:00.000Z'),
      serviceType: 'Preventive Maintenance',
      status: ServiceStatus.COMPLETED,
    };

    it('should update the service record status using the authenticated user ID', async () => {
      serviceRecordServiceMock.updateStatus.mockResolvedValue(
        updatedServiceRecord,
      );

      const result = await controller.updateStatus(serviceRecordId, user, dto);

      expect(serviceRecordServiceMock.updateStatus).toHaveBeenCalledWith(
        serviceRecordId,
        user.id,
        dto,
      );

      expect(result).toEqual(updatedServiceRecord);
    });
  });
});
