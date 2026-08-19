import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AssetsService } from './assets.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AssetsService', () => {
  let service: AssetsService;

  const prismaMock = {
    equipmentType: {
      findFirst: jest.fn(),
    },
    asset: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
  });

  // ============================================================= //
  // CREATE
  // ============================================================= //

  describe('create', () => {
    const ownerId = 'user-1';

    const createDto = {
      brand: 'Daikin',
      model: 'FTKF35',
      serialNumber: 'SN-001',
      equipmentTypeId: 'equipment-type-1',
      installationDate: '2025-01-15',
      location: 'Living Room',
    };

    const equipmentType = {
      id: 'equipment-type-1',
      name: 'Air Conditioner',
      description: 'Air conditioning equipment',
      isActive: true,
    };

    const createdAsset = {
      id: 'asset-1',
      brand: 'Daikin',
      model: 'FTKF35',
      serialNumber: 'SN-001',
      equipmentTypeId: 'equipment-type-1',
      installationDate: new Date('2025-01-15'),
      location: 'Living Room',
      ownerId,
      equipmentType,
    };

    it('should create an asset with a valid active equipment type', async () => {
      prismaMock.equipmentType.findFirst.mockResolvedValue(equipmentType);
      prismaMock.asset.findUnique.mockResolvedValue(null);
      prismaMock.asset.create.mockResolvedValue(createdAsset);

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

      expect(prismaMock.asset.create).toHaveBeenCalledWith({
        data: {
          brand: createDto.brand,
          model: createDto.model,
          serialNumber: createDto.serialNumber,
          equipmentTypeId: createDto.equipmentTypeId,
          installationDate: new Date(createDto.installationDate),
          location: createDto.location,
          ownerId,
        },
        include: {
          equipmentType: true,
        },
      });

      expect(result).toEqual(createdAsset);
    });

    it('should create an asset without checking serial number when serial number is not provided', async () => {
      const dtoWithoutSerialNumber = {
        ...createDto,
        serialNumber: undefined,
      };

      prismaMock.equipmentType.findFirst.mockResolvedValue(equipmentType);
      prismaMock.asset.create.mockResolvedValue({
        ...createdAsset,
        serialNumber: null,
      });

      const result = await service.create(ownerId, dtoWithoutSerialNumber);

      expect(prismaMock.equipmentType.findFirst).toHaveBeenCalledWith({
        where: {
          id: dtoWithoutSerialNumber.equipmentTypeId,
          isActive: true,
        },
      });

      expect(prismaMock.asset.findUnique).not.toHaveBeenCalled();

      expect(prismaMock.asset.create).toHaveBeenCalledWith({
        data: {
          brand: dtoWithoutSerialNumber.brand,
          model: dtoWithoutSerialNumber.model,
          serialNumber: undefined,
          equipmentTypeId: dtoWithoutSerialNumber.equipmentTypeId,
          installationDate: new Date(dtoWithoutSerialNumber.installationDate!),
          location: dtoWithoutSerialNumber.location,
          ownerId,
        },
        include: {
          equipmentType: true,
        },
      });

      expect(result).toEqual({
        ...createdAsset,
        serialNumber: null,
      });
    });

    it('should create an asset without installation date when it is not provided', async () => {
      const dtoWithoutInstallationDate = {
        ...createDto,
        installationDate: undefined,
      };

      prismaMock.equipmentType.findFirst.mockResolvedValue(equipmentType);
      prismaMock.asset.findUnique.mockResolvedValue(null);
      prismaMock.asset.create.mockResolvedValue(createdAsset);

      await service.create(ownerId, dtoWithoutInstallationDate);

      expect(prismaMock.asset.create).toHaveBeenCalledWith({
        data: {
          brand: dtoWithoutInstallationDate.brand,
          model: dtoWithoutInstallationDate.model,
          serialNumber: dtoWithoutInstallationDate.serialNumber,
          equipmentTypeId: dtoWithoutInstallationDate.equipmentTypeId,
          installationDate: undefined,
          location: dtoWithoutInstallationDate.location,
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
      expect(prismaMock.asset.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the serial number already exists', async () => {
      prismaMock.equipmentType.findFirst.mockResolvedValue(equipmentType);

      prismaMock.asset.findUnique.mockResolvedValue({
        id: 'existing-asset',
        serialNumber: createDto.serialNumber,
      });

      await expect(service.create(ownerId, createDto)).rejects.toThrow(
        new ConflictException(
          'An asset with this serial number already exists',
        ),
      );

      expect(prismaMock.asset.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================= //
  // FIND ALL
  // ============================================================= //

  describe('findAll', () => {
    const ownerId = 'user-1';

    const assets = [
      {
        id: 'asset-2',
        brand: 'Panasonic',
        model: 'CS-XU12',
        ownerId,
        equipmentType: {
          id: 'equipment-type-1',
          name: 'Air Conditioner',
        },
        qrCode: null,
      },
      {
        id: 'asset-1',
        brand: 'Daikin',
        model: 'FTKF35',
        ownerId,
        equipmentType: {
          id: 'equipment-type-1',
          name: 'Air Conditioner',
        },
        qrCode: {
          id: 'qr-1',
          token: 'ATR_TEST_TOKEN',
        },
      },
    ];

    it('should return all assets belonging to the owner ordered by creation date', async () => {
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
    const assetId = 'asset-1';
    const ownerId = 'user-1';

    const asset = {
      id: assetId,
      brand: 'Daikin',
      model: 'FTKF35',
      serialNumber: 'SN-001',
      equipmentTypeId: 'equipment-type-1',
      ownerId,
      equipmentType: {
        id: 'equipment-type-1',
        name: 'Air Conditioner',
      },
      qrCode: {
        id: 'qr-1',
        token: 'ATR_TEST_TOKEN',
      },
      serviceRecords: [
        {
          id: 'service-2',
          serviceDate: new Date('2026-02-01'),
        },
        {
          id: 'service-1',
          serviceDate: new Date('2025-01-01'),
        },
      ],
    };

    it('should return the asset belonging to the owner', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(asset);

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

      expect(result).toEqual(asset);
    });

    it('should throw NotFoundException when the asset does not exist', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(null);

      await expect(service.findOne(assetId, ownerId)).rejects.toThrow(
        new NotFoundException('Asset not found'),
      );
    });

    it('should throw NotFoundException when the asset belongs to another owner', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(null);

      await expect(service.findOne(assetId, 'another-user')).rejects.toThrow(
        new NotFoundException('Asset not found'),
      );

      expect(prismaMock.asset.findFirst).toHaveBeenCalledWith({
        where: {
          id: assetId,
          ownerId: 'another-user',
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
    });
  });

  // ============================================================= //
  // UPDATE
  // ============================================================= //

  describe('update', () => {
    const assetId = 'asset-1';
    const ownerId = 'user-1';

    const existingAsset = {
      id: assetId,
      brand: 'Daikin',
      model: 'FTKF35',
      serialNumber: 'SN-001',
      equipmentTypeId: 'equipment-type-1',
      ownerId,
    };

    const updateDto = {
      brand: 'Daikin',
      model: 'FTKF50',
      serialNumber: 'SN-002',
      equipmentTypeId: 'equipment-type-2',
      installationDate: '2026-01-15',
      location: 'Bedroom',
    };

    const updatedAsset = {
      ...existingAsset,
      model: 'FTKF50',
      serialNumber: 'SN-002',
      equipmentTypeId: 'equipment-type-2',
      installationDate: new Date('2026-01-15'),
      location: 'Bedroom',
      equipmentType: {
        id: 'equipment-type-2',
        name: 'Air Conditioner',
      },
    };

    it('should update an asset successfully', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(existingAsset);

      prismaMock.equipmentType.findFirst.mockResolvedValue({
        id: 'equipment-type-2',
        name: 'Air Conditioner',
        isActive: true,
      });

      prismaMock.asset.findUnique.mockResolvedValue(null);
      prismaMock.asset.update.mockResolvedValue(updatedAsset);

      const result = await service.update(assetId, ownerId, updateDto);

      expect(prismaMock.asset.findFirst).toHaveBeenCalledWith({
        where: {
          id: assetId,
          ownerId,
        },
      });

      expect(prismaMock.equipmentType.findFirst).toHaveBeenCalledWith({
        where: {
          id: updateDto.equipmentTypeId,
          isActive: true,
        },
      });

      expect(prismaMock.asset.findUnique).toHaveBeenCalledWith({
        where: {
          serialNumber: updateDto.serialNumber,
        },
      });

      expect(prismaMock.asset.update).toHaveBeenCalledWith({
        where: {
          id: assetId,
        },
        data: {
          brand: updateDto.brand,
          model: updateDto.model,
          serialNumber: updateDto.serialNumber,
          equipmentTypeId: updateDto.equipmentTypeId,
          installationDate: new Date(updateDto.installationDate),
          location: updateDto.location,
        },
        include: {
          equipmentType: true,
        },
      });

      expect(result).toEqual(updatedAsset);
    });

    it('should throw NotFoundException when the asset does not exist', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(null);

      await expect(service.update(assetId, ownerId, updateDto)).rejects.toThrow(
        new NotFoundException('Asset not found'),
      );

      expect(prismaMock.equipmentType.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.asset.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.asset.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the asset belongs to another owner', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(null);

      await expect(
        service.update(assetId, 'another-user', updateDto),
      ).rejects.toThrow(new NotFoundException('Asset not found'));

      expect(prismaMock.asset.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the new equipment type does not exist or is inactive', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(existingAsset);
      prismaMock.equipmentType.findFirst.mockResolvedValue(null);

      await expect(service.update(assetId, ownerId, updateDto)).rejects.toThrow(
        new NotFoundException('Equipment type not found or is inactive'),
      );

      expect(prismaMock.asset.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.asset.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the new serial number already exists', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(existingAsset);

      prismaMock.equipmentType.findFirst.mockResolvedValue({
        id: updateDto.equipmentTypeId,
        name: 'Air Conditioner',
        isActive: true,
      });

      prismaMock.asset.findUnique.mockResolvedValue({
        id: 'another-asset',
        serialNumber: updateDto.serialNumber,
      });

      await expect(service.update(assetId, ownerId, updateDto)).rejects.toThrow(
        new ConflictException(
          'An asset with this serial number already exists',
        ),
      );

      expect(prismaMock.asset.update).not.toHaveBeenCalled();
    });

    it('should not check serial number uniqueness when the serial number is unchanged', async () => {
      const dtoWithSameSerial = {
        ...updateDto,
        serialNumber: existingAsset.serialNumber,
      };

      prismaMock.asset.findFirst.mockResolvedValue(existingAsset);

      prismaMock.equipmentType.findFirst.mockResolvedValue({
        id: dtoWithSameSerial.equipmentTypeId,
        name: 'Air Conditioner',
        isActive: true,
      });

      prismaMock.asset.update.mockResolvedValue(updatedAsset);

      await service.update(assetId, ownerId, dtoWithSameSerial);

      expect(prismaMock.asset.findUnique).not.toHaveBeenCalled();

      expect(prismaMock.asset.update).toHaveBeenCalled();
    });

    it('should not verify equipment type when equipmentTypeId is not being changed', async () => {
      const dtoWithoutEquipmentType = {
        ...updateDto,
        equipmentTypeId: undefined,
      };

      prismaMock.asset.findFirst.mockResolvedValue(existingAsset);
      prismaMock.asset.findUnique.mockResolvedValue(null);
      prismaMock.asset.update.mockResolvedValue(updatedAsset);

      await service.update(assetId, ownerId, dtoWithoutEquipmentType);

      expect(prismaMock.equipmentType.findFirst).not.toHaveBeenCalled();

      expect(prismaMock.asset.update).toHaveBeenCalled();
    });
  });

  // ============================================================= //
  // REMOVE
  // ============================================================= //

  describe('remove', () => {
    const assetId = 'asset-1';
    const ownerId = 'user-1';

    const asset = {
      id: assetId,
      brand: 'Daikin',
      model: 'FTKF35',
      ownerId,
    };

    const deletedAsset = {
      id: assetId,
      brand: 'Daikin',
      model: 'FTKF35',
      ownerId,
    };

    it('should remove the asset belonging to the owner', async () => {
      prismaMock.asset.findFirst.mockResolvedValue(asset);
      prismaMock.asset.delete.mockResolvedValue(deletedAsset);

      const result = await service.remove(assetId, ownerId);

      expect(prismaMock.asset.findFirst).toHaveBeenCalledWith({
        where: {
          id: assetId,
          ownerId,
        },
      });

      expect(prismaMock.asset.delete).toHaveBeenCalledWith({
        where: {
          id: assetId,
        },
      });

      expect(result).toEqual(deletedAsset);
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

      await expect(service.remove(assetId, 'another-user')).rejects.toThrow(
        new NotFoundException('Asset not found'),
      );

      expect(prismaMock.asset.delete).not.toHaveBeenCalled();
    });
  });
});
