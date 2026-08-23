import { Test, TestingModule } from '@nestjs/testing';

import { QrController } from './qr.controller';
import { QrService } from './qr.service';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

import { RoleName } from '../roles/enums/role-name.enum';

describe('QrController', () => {
  let controller: QrController;

  const qrServiceMock = {
    createForAsset: jest.fn(),
    getPublicPassport: jest.fn(),
    regenerateForAsset: jest.fn(),
    deactivate: jest.fn(),
    activate: jest.fn(),
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
          name: RoleName.OWNER,
          description: 'Asset owner',
        },
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QrController],
      providers: [
        {
          provide: QrService,
          useValue: qrServiceMock,
        },
      ],
    }).compile();

    controller = module.get<QrController>(QrController);
  });

  // ============================================================= //
  // CREATE FOR ASSET
  // ============================================================= //

  describe('createForAsset', () => {
    it('should pass the asset id and authenticated user id to the service', async () => {
      const assetId = 'asset-1';

      const qrCode = {
        id: 'qr-1',
        token: 'ATR_test-token',
        url: 'https://airtracer.local/qr/ATR_test-token',
        asset: {
          id: assetId,
        },
      };

      qrServiceMock.createForAsset.mockResolvedValue(qrCode);

      const result = await controller.createForAsset(assetId, user);

      expect(qrServiceMock.createForAsset).toHaveBeenCalledWith(
        assetId,
        user.id,
      );

      expect(result).toEqual(qrCode);
    });
  });

  // ============================================================= //
  // FIND BY TOKEN
  // ============================================================= //

  describe('findByToken', () => {
    it('should pass the QR token to the service', async () => {
      const token = 'ATR_test-token';

      const passport = {
        asset: {
          id: 'asset-1',
          brand: 'Daikin',
          model: 'FTKF35',
          serialNumber: 'SN-001',
          equipmentType: 'Air Conditioner',
          installationDate: new Date('2025-01-15T00:00:00.000Z'),
          location: 'Living Room',
        },
        serviceHistory: [],
      };

      qrServiceMock.getPublicPassport.mockResolvedValue(passport);

      const result = await controller.findByToken(token);

      expect(qrServiceMock.getPublicPassport).toHaveBeenCalledWith(token);

      expect(result).toEqual(passport);
    });
  });

  // ============================================================= //
  // REGENERATE
  // ============================================================= //

  describe('regenerate', () => {
    it('should pass the asset id and authenticated user id to the service', async () => {
      const assetId = 'asset-1';

      const regeneratedQrCode = {
        id: 'qr-1',
        token: 'ATR_new-token',
        url: 'https://airtracer.local/qr/ATR_new-token',
        asset: {
          id: assetId,
        },
      };

      qrServiceMock.regenerateForAsset.mockResolvedValue(regeneratedQrCode);

      const result = await controller.regenerate(assetId, user);

      expect(qrServiceMock.regenerateForAsset).toHaveBeenCalledWith(
        assetId,
        user.id,
      );

      expect(result).toEqual(regeneratedQrCode);
    });
  });

  // ============================================================= //
  // DEACTIVATE
  // ============================================================= //

  describe('deactivate', () => {
    it('should pass the QR token and authenticated user id to the service', async () => {
      const token = 'ATR_test-token';

      const deactivatedQrCode = {
        id: 'qr-1',
        token,
        isActive: false,
      };

      qrServiceMock.deactivate.mockResolvedValue(deactivatedQrCode);

      const result = await controller.deactivate(token, user);

      expect(qrServiceMock.deactivate).toHaveBeenCalledWith(token, user.id);

      expect(result).toEqual(deactivatedQrCode);
    });
  });

  // ============================================================= //
  // ACTIVATE
  // ============================================================= //

  describe('activate', () => {
    it('should pass the QR token and authenticated user id to the service', async () => {
      const token = 'ATR_test-token';

      const activatedQrCode = {
        id: 'qr-1',
        token,
        isActive: true,
      };

      qrServiceMock.activate.mockResolvedValue(activatedQrCode);

      const result = await controller.activate(token, user);

      expect(qrServiceMock.activate).toHaveBeenCalledWith(token, user.id);

      expect(result).toEqual(activatedQrCode);
    });
  });
});
