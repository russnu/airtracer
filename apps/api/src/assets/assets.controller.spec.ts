import { Test, TestingModule } from '@nestjs/testing';

import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import type { CreateAssetDto } from './dto/create-asset.dto';
import type { UpdateAssetDto } from './dto/update-asset.dto';

describe('AssetsController', () => {
  let controller: AssetsController;

  const assetsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
    remove: jest.fn(),
  };

  const user: AuthenticatedUser = {
    id: 'user-1',
    email: 'owner@example.com',
    firstName: 'John',
    lastName: 'Doe',
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
          name: 'OWNER',
          description: 'Asset owner',
        },
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssetsController],
      providers: [
        {
          provide: AssetsService,
          useValue: assetsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AssetsController>(AssetsController);
  });

  // ============================================================= //
  // CREATE
  // ============================================================= //

  describe('create', () => {
    it('should pass the authenticated user id and DTO to the service', async () => {
      const dto = {
        brand: 'Daikin',
        model: 'FTKF35',
        serialNumber: 'SN-001',
        equipmentTypeId: 'equipment-type-1',
        installationDate: '2025-01-15',
        location: 'Living Room',
      } as CreateAssetDto;

      const createdAsset = {
        id: 'asset-1',
        ...dto,
        ownerId: user.id,
      };

      assetsServiceMock.create.mockResolvedValue(createdAsset);

      const result = await controller.create(user, dto);

      expect(assetsServiceMock.create).toHaveBeenCalledWith(user.id, dto);

      expect(result).toEqual(createdAsset);
    });
  });

  // ============================================================= //
  // FIND ALL
  // ============================================================= //

  describe('findAll', () => {
    it('should pass the authenticated user id to the service', async () => {
      const assets = [
        {
          id: 'asset-1',
          brand: 'Daikin',
          model: 'FTKF35',
          ownerId: user.id,
        },
        {
          id: 'asset-2',
          brand: 'Panasonic',
          model: 'CS-XU12',
          ownerId: user.id,
        },
      ];

      assetsServiceMock.findAll.mockResolvedValue(assets);

      const result = await controller.findAll(user);

      expect(assetsServiceMock.findAll).toHaveBeenCalledWith(user.id);

      expect(result).toEqual(assets);
    });
  });

  // ============================================================= //
  // FIND ONE
  // ============================================================= //

  describe('findOne', () => {
    it('should pass the asset id and authenticated user id to the service', async () => {
      const assetId = 'asset-1';

      const asset = {
        id: assetId,
        brand: 'Daikin',
        model: 'FTKF35',
        ownerId: user.id,
      };

      assetsServiceMock.findOne.mockResolvedValue(asset);

      const result = await controller.findOne(assetId, user);

      expect(assetsServiceMock.findOne).toHaveBeenCalledWith(assetId, user.id);

      expect(result).toEqual(asset);
    });
  });

  // ============================================================= //
  // UPDATE
  // ============================================================= //

  describe('update', () => {
    it('should pass the asset id, authenticated user id, and DTO to the service', async () => {
      const assetId = 'asset-1';

      const dto = {
        brand: 'Daikin',
        model: 'FTKF50',
        location: 'Bedroom',
      } as UpdateAssetDto;

      const updatedAsset = {
        id: assetId,
        brand: 'Daikin',
        model: 'FTKF50',
        location: 'Bedroom',
        ownerId: user.id,
      };

      assetsServiceMock.update.mockResolvedValue(updatedAsset);

      const result = await controller.update(assetId, user, dto);

      expect(assetsServiceMock.update).toHaveBeenCalledWith(
        assetId,
        user.id,
        dto,
      );

      expect(result).toEqual(updatedAsset);
    });
  });

  // ============================================================= //
  // DEACTIVATE
  // ============================================================= //

  describe('deactivate', () => {
    it('should pass the asset id and authenticated user id to the service', async () => {
      const assetId = 'asset-1';

      const deactivatedAsset = {
        id: assetId,
        isActive: false,
        ownerId: user.id,
      };

      assetsServiceMock.deactivate.mockResolvedValue(deactivatedAsset);

      const result = await controller.deactivate(assetId, user);

      expect(assetsServiceMock.deactivate).toHaveBeenCalledWith(
        assetId,
        user.id,
      );

      expect(result).toEqual(deactivatedAsset);
    });
  });

  // ============================================================= //
  // REMOVE
  // ============================================================= //

  describe('remove', () => {
    it('should pass the asset id and authenticated user id to the service', async () => {
      const assetId = 'asset-1';

      const deletedAsset = {
        id: assetId,
        brand: 'Daikin',
        model: 'FTKF35',
        ownerId: user.id,
      };

      assetsServiceMock.remove.mockResolvedValue(deletedAsset);

      const result = await controller.remove(assetId, user);

      expect(assetsServiceMock.remove).toHaveBeenCalledWith(assetId, user.id);

      expect(result).toEqual(deletedAsset);
    });
  });
});
