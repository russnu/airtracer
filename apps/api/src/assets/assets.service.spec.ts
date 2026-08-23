import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AssetsService } from './assets.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

import { Event } from '../../generated/prisma/enums';

import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

describe('AssetsService', () => {
  let service: AssetsService;

  const prismaMock = {
    asset: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    equipmentType: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const auditServiceMock = {
    log: jest.fn(),
  };

  const txMock = {
    asset: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const ownerId = 'owner-1';
  const assetId = 'asset-1';

  const equipmentType = {
    id: 'equipment-type-1',
    name: 'Air Conditioner',
    description: 'Air conditioning equipment',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createdAsset = {
    id: assetId,
    brand: 'Daikin',
    model: 'FTKF35',
    serialNumber: 'SN-001',
    isActive: true,

    equipmentTypeId: equipmentType.id,
    equipmentType,

    refrigerant: 'R-32',
    capacity: 1.5,
    capacityUnit: 'HP',

    installationDate: new Date('2026-01-01T00:00:00.000Z'),
    location: 'Room 101',

    ownerId,

    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const existingAsset = {
    ...createdAsset,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback(txMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
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

    service = module.get<AssetsService>(AssetsService);
  });

  // ============================================================= //
  // CREATE
  // ============================================================= //

  describe('create', () => {
    const createDto: CreateAssetDto = {
      brand: 'Daikin',
      model: 'FTKF35',
      serialNumber: 'SN-001',
      equipmentTypeId: equipmentType.id,

      refrigerant: 'R-32',
      capacity: 1.5,
      capacityUnit: 'HP',

      installationDate: '2026-01-01T00:00:00.000Z',
      location: 'Room 101',
    };

    it('should create an asset with a valid active equipment type', async () => {
      prismaMock.equipmentType.findFirst.mockResolvedValue(equipmentType);

      prismaMock.asset.findUnique.mockResolvedValue(null);

      txMock.asset.create.mockResolvedValue(createdAsset);

      const result = await service.create(ownerId, createDto);

      expect(prismaMock.equipmentType.findFirst).toHaveBeenCalledWith({
        where: {
          id: createDto.equipmentTypeId,
          isActive: true,
        },
      });

      expect(prismaMock.asset.findUnique).toHaveBeenCalledWith({
        where: {
          serialNumber: createDto.serialNumber,
        },
      });

      expect(txMock.asset.create).toHaveBeenCalledWith({
        data: {
          brand: createDto.brand,
          model: createDto.model,
          serialNumber: createDto.serialNumber,
          equipmentTypeId: createDto.equipmentTypeId,

          refrigerant: createDto.refrigerant,
          capacity: createDto.capacity,
          capacityUnit: createDto.capacityUnit,

          installationDate: new Date(createDto.installationDate!),
          location: createDto.location,
          ownerId,
        },
        include: {
          equipmentType: true,
        },
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        {
          actorId: ownerId,
          assetId: createdAsset.id,
          event: Event.ASSET_CREATED,
          payload: {
            brand: createdAsset.brand,
            model: createdAsset.model,
            serialNumber: createdAsset.serialNumber,
            equipmentTypeId: createdAsset.equipmentTypeId,

            refrigerant: createdAsset.refrigerant,
            capacity: createdAsset.capacity,
            capacityUnit: createdAsset.capacityUnit,

            installationDate:
              createdAsset.installationDate?.toISOString() ?? null,

            location: createdAsset.location,
            ownerId: createdAsset.ownerId,
          },
        },
        txMock,
      );

      expect(result).toEqual(createdAsset);
    });

    it('should create an asset without checking serial number when serial number is not provided', async () => {
      const dto: CreateAssetDto = {
        ...createDto,
        serialNumber: undefined,
      };

      prismaMock.equipmentType.findFirst.mockResolvedValue(equipmentType);

      txMock.asset.create.mockResolvedValue({
        ...createdAsset,
        serialNumber: null,
      });

      await service.create(ownerId, dto);

      expect(prismaMock.asset.findUnique).not.toHaveBeenCalled();

      expect(txMock.asset.create).toHaveBeenCalled();
    });

    it('should create an asset without installation date when it is not provided', async () => {
      const dto: CreateAssetDto = {
        ...createDto,
        installationDate: undefined,
      };

      prismaMock.equipmentType.findFirst.mockResolvedValue(equipmentType);

      txMock.asset.create.mockResolvedValue({
        ...createdAsset,
        installationDate: null,
      });

      await service.create(ownerId, dto);

      expect(txMock.asset.create).toHaveBeenCalledWith({
        data: {
          brand: dto.brand,
          model: dto.model,
          serialNumber: dto.serialNumber,
          equipmentTypeId: dto.equipmentTypeId,

          refrigerant: dto.refrigerant,
          capacity: dto.capacity,
          capacityUnit: dto.capacityUnit,

          installationDate: undefined,
          location: dto.location,
          ownerId,
        },
        include: {
          equipmentType: true,
        },
      });
    });

    it('should throw NotFoundException when the equipment type does not exist', async () => {
      prismaMock.equipmentType.findFirst.mockResolvedValue(null);

      await expect(service.create(ownerId, createDto)).rejects.toThrow(
        new NotFoundException('Equipment type not found or is inactive'),
      );

      expect(prismaMock.asset.findUnique).not.toHaveBeenCalled();

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the serial number already exists', async () => {
      prismaMock.equipmentType.findFirst.mockResolvedValue(equipmentType);

      prismaMock.asset.findUnique.mockResolvedValue(existingAsset);

      await expect(service.create(ownerId, createDto)).rejects.toThrow(
        new ConflictException(
          'An asset with this serial number already exists',
        ),
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  // ============================================================= //
  // FIND ALL
  // ============================================================= //

  describe('findAll', () => {
    it('should return all assets belonging to the owner ordered by creation date', async () => {
      const assets = [createdAsset];

      prismaMock.asset.findMany.mockResolvedValue(assets);

      const result = await service.findAll(ownerId);

      expect(prismaMock.asset.findMany).toHaveBeenCalledWith({
        where: {
          ownerId,
        },
        include: {
          equipmentType: true,
          qrCode: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(result).toEqual(assets);
    });

    it('should return an empty array when the owner has no assets', async () => {
      prismaMock.asset.findMany.mockResolvedValue([]);

      const result = await service.findAll(ownerId);

      expect(result).toEqual([]);

      expect(prismaMock.asset.findMany).toHaveBeenCalledWith({
        where: {
          ownerId,
        },
        include: {
          equipmentType: true,
          qrCode: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });

  // ============================================================= //
  // FIND ONE
  // ============================================================= //

  describe('findOne', () => {
    it('should return the asset belonging to the owner', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(createdAsset);

      const result = await service.findOne(assetId, ownerId);

      expect(prismaMock.asset.findFirst).toHaveBeenCalledWith({
        where: {
          id: assetId,
          ownerId,
        },
        include: {
          equipmentType: true,
          qrCode: true,
          serviceRecords: {
            orderBy: {
              serviceDate: 'desc',
            },
          },
        },
      });

      expect(result).toEqual(createdAsset);
    });

    it('should throw NotFoundException when the asset does not exist', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(null);

      await expect(service.findOne(assetId, ownerId)).rejects.toThrow(
        new NotFoundException('Asset not found'),
      );
    });

    it('should throw NotFoundException when the asset belongs to another owner', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(null);

      await expect(service.findOne(assetId, 'another-owner')).rejects.toThrow(
        new NotFoundException('Asset not found'),
      );
    });
  });

  // ============================================================= //
  // UPDATE
  // ============================================================= //

  describe('update', () => {
    const updateDto: UpdateAssetDto = {
      brand: 'Mitsubishi',
      model: 'MSY-GR35',
      serialNumber: 'SN-002',
      equipmentTypeId: 'equipment-type-2',

      refrigerant: 'R-410A',
      capacity: 2,
      capacityUnit: 'HP',

      installationDate: '2026-02-01T00:00:00.000Z',
      location: 'Room 202',
    };

    const updatedAsset = {
      ...createdAsset,
      brand: 'Mitsubishi',
      model: 'MSY-GR',
      serialNumber: 'SN-002',
      equipmentTypeId: 'equipment-type-2',
      refrigerant: 'R-410A',
      capacity: 2,
      capacityUnit: 'HP',
      installationDate: new Date('2026-02-01T00:00:00.000Z'),
      location: 'Room 202',
      equipmentType: {
        ...equipmentType,
        id: 'equipment-type-2',
      },
    };

    it('should update an asset successfully and log the changes', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(existingAsset);

      prismaMock.equipmentType.findFirst.mockResolvedValue({
        ...equipmentType,
        id: 'equipment-type-2',
      });

      prismaMock.asset.findUnique.mockResolvedValue(null);

      txMock.asset.update.mockResolvedValue(updatedAsset);

      const result = await service.update(assetId, ownerId, updateDto);

      expect(txMock.asset.update).toHaveBeenCalledWith({
        where: {
          id: assetId,
        },
        data: {
          brand: updateDto.brand,
          model: updateDto.model,
          serialNumber: updateDto.serialNumber,
          equipmentTypeId: updateDto.equipmentTypeId,

          refrigerant: updateDto.refrigerant,
          capacity: updateDto.capacity,
          capacityUnit: updateDto.capacityUnit,

          installationDate: new Date(updateDto.installationDate!),
          location: updateDto.location,
        },
        include: {
          equipmentType: true,
        },
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        {
          actorId: ownerId,
          assetId: updatedAsset.id,
          event: Event.ASSET_UPDATED,
          payload: {
            changes: {
              brand: {
                from: existingAsset.brand,
                to: updatedAsset.brand,
              },

              model: {
                from: existingAsset.model,
                to: updatedAsset.model,
              },

              serialNumber: {
                from: existingAsset.serialNumber,
                to: updatedAsset.serialNumber,
              },

              equipmentTypeId: {
                from: existingAsset.equipmentTypeId,
                to: updatedAsset.equipmentTypeId,
              },

              refrigerant: {
                from: existingAsset.refrigerant,
                to: updatedAsset.refrigerant,
              },

              capacity: {
                from: existingAsset.capacity,
                to: updatedAsset.capacity,
              },

              installationDate: {
                from: existingAsset.installationDate?.toISOString() ?? null,
                to: updatedAsset.installationDate?.toISOString() ?? null,
              },

              location: {
                from: existingAsset.location,
                to: updatedAsset.location,
              },
            },
          },
        },
        txMock,
      );

      expect(result).toEqual(updatedAsset);
    });

    it('should throw NotFoundException when the asset does not exist', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(null);

      await expect(service.update(assetId, ownerId, updateDto)).rejects.toThrow(
        new NotFoundException('Asset not found'),
      );

      expect(prismaMock.equipmentType.findFirst).not.toHaveBeenCalled();

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the asset belongs to another owner', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(null);

      await expect(
        service.update(assetId, 'another-owner', updateDto),
      ).rejects.toThrow(new NotFoundException('Asset not found'));
    });

    it('should throw NotFoundException when the new equipment type does not exist or is inactive', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(existingAsset);

      prismaMock.equipmentType.findFirst.mockResolvedValue(null);

      await expect(service.update(assetId, ownerId, updateDto)).rejects.toThrow(
        new NotFoundException('Equipment type not found or is inactive'),
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the new serial number already exists', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(existingAsset);

      prismaMock.equipmentType.findFirst.mockResolvedValue({
        ...equipmentType,
        id: updateDto.equipmentTypeId,
      });

      prismaMock.asset.findUnique.mockResolvedValue({
        ...existingAsset,
        id: 'another-asset',
        serialNumber: updateDto.serialNumber,
      });

      await expect(service.update(assetId, ownerId, updateDto)).rejects.toThrow(
        new ConflictException(
          'An asset with this serial number already exists',
        ),
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should not check serial number uniqueness when the serial number is unchanged', async () => {
      const dto: UpdateAssetDto = {
        ...updateDto,
        serialNumber: existingAsset.serialNumber,
      };

      prismaMock.asset.findFirst.mockResolvedValue(existingAsset);

      prismaMock.equipmentType.findFirst.mockResolvedValue({
        ...equipmentType,
        id: dto.equipmentTypeId,
      });

      txMock.asset.update.mockResolvedValue({
        ...existingAsset,
        ...dto,
        installationDate: dto.installationDate
          ? new Date(dto.installationDate)
          : existingAsset.installationDate,
      });

      await service.update(assetId, ownerId, dto);

      expect(prismaMock.asset.findUnique).not.toHaveBeenCalled();
    });

    it('should not verify equipment type when equipmentTypeId is not being changed', async () => {
      const dto: UpdateAssetDto = {
        brand: 'Updated Brand',
        model: existingAsset.model,
        serialNumber: existingAsset.serialNumber,

        refrigerant: existingAsset.refrigerant,
        capacity: existingAsset.capacity,
        capacityUnit: existingAsset.capacityUnit,

        location: existingAsset.location,
      };

      const updated = {
        ...existingAsset,
        brand: 'Updated Brand',
      };

      prismaMock.asset.findFirst.mockResolvedValue(existingAsset);

      txMock.asset.update.mockResolvedValue(updated);

      await service.update(assetId, ownerId, dto);

      expect(prismaMock.equipmentType.findFirst).not.toHaveBeenCalled();

      expect(resultOrUndefined(txMock.asset.update)).toBeDefined();
    });

    it('should not create an audit log when there are no changes', async () => {
      const dto: UpdateAssetDto = {
        brand: existingAsset.brand,
        model: existingAsset.model,
        serialNumber: existingAsset.serialNumber,
        equipmentTypeId: existingAsset.equipmentTypeId,

        refrigerant: existingAsset.refrigerant,
        capacity: existingAsset.capacity,
        capacityUnit: existingAsset.capacityUnit,

        installationDate: existingAsset.installationDate?.toISOString(),
        location: existingAsset.location,
      };

      prismaMock.asset.findFirst.mockResolvedValue(existingAsset);

      prismaMock.equipmentType.findFirst.mockResolvedValue(equipmentType);

      txMock.asset.update.mockResolvedValue(existingAsset);

      await service.update(assetId, ownerId, dto);

      expect(auditServiceMock.log).not.toHaveBeenCalled();
    });

    it('should log a change from a value to null', async () => {
      const dto: UpdateAssetDto = {
        refrigerant: undefined,
        capacity: undefined,
        capacityUnit: undefined,
        location: undefined,
      };

      const updated = {
        ...existingAsset,
        refrigerant: null,
        capacity: null,
        capacityUnit: null,
        location: null,
      };

      prismaMock.asset.findFirst.mockResolvedValue(existingAsset);

      txMock.asset.update.mockResolvedValue(updated);

      await service.update(assetId, ownerId, dto);

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        {
          actorId: ownerId,
          assetId: updated.id,
          event: Event.ASSET_UPDATED,
          payload: {
            changes: {
              refrigerant: {
                from: existingAsset.refrigerant,
                to: null,
              },

              capacity: {
                from: existingAsset.capacity,
                to: null,
              },

              capacityUnit: {
                from: existingAsset.capacityUnit,
                to: null,
              },

              location: {
                from: existingAsset.location,
                to: null,
              },
            },
          },
        },
        txMock,
      );
    });
  });

  // ============================================================= //
  // DEACTIVATE
  // ============================================================= //

  describe('deactivate', () => {
    it('should deactivate the asset and create an audit log', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(existingAsset);

      const deactivatedAsset = {
        ...existingAsset,
        isActive: false,
      };

      txMock.asset.update.mockResolvedValue(deactivatedAsset);

      const result = await service.deactivate(assetId, ownerId);

      expect(prismaMock.asset.findFirst).toHaveBeenCalledWith({
        where: {
          id: assetId,
          ownerId,
          isActive: true,
        },
      });

      expect(txMock.asset.update).toHaveBeenCalledWith({
        where: {
          id: assetId,
        },
        data: {
          isActive: false,
        },
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        {
          actorId: ownerId,
          assetId,
          event: Event.ASSET_DEACTIVATED,
          payload: {
            previousStatus: true,
            newStatus: false,
          },
        },
        txMock,
      );

      expect(result).toEqual(deactivatedAsset);
    });

    it('should throw NotFoundException when the asset does not exist', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(null);

      await expect(service.deactivate(assetId, ownerId)).rejects.toThrow(
        new NotFoundException('Asset not found or already inactive'),
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the asset is already inactive', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(null);

      await expect(service.deactivate(assetId, ownerId)).rejects.toThrow(
        new NotFoundException('Asset not found or already inactive'),
      );
    });

    it('should throw NotFoundException when the asset belongs to another owner', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(null);

      await expect(
        service.deactivate(assetId, 'another-owner'),
      ).rejects.toThrow(
        new NotFoundException('Asset not found or already inactive'),
      );
    });
  });

  // ============================================================= //
  // REMOVE
  // ============================================================= //

  describe('remove', () => {
    it('should remove the asset belonging to the owner', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(existingAsset);

      prismaMock.asset.delete.mockResolvedValue(existingAsset);

      const result = await service.remove(assetId, ownerId);

      expect(prismaMock.asset.findFirst).toHaveBeenCalledWith({
        where: {
          id: assetId,
          ownerId,
        },
      });

      expect(prismaMock.asset.delete).toHaveBeenCalledWith({
        where: {
          id: existingAsset.id,
        },
      });

      expect(result).toEqual(existingAsset);
    });

    it('should throw NotFoundException when the asset does not exist', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(null);

      await expect(service.remove(assetId, ownerId)).rejects.toThrow(
        new NotFoundException('Asset not found'),
      );

      expect(prismaMock.asset.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the asset belongs to another owner', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(null);

      await expect(service.remove(assetId, 'another-owner')).rejects.toThrow(
        new NotFoundException('Asset not found'),
      );

      expect(prismaMock.asset.delete).not.toHaveBeenCalled();
    });
  });
});

function resultOrUndefined<T>(value: T): T | undefined {
  return value;
}
