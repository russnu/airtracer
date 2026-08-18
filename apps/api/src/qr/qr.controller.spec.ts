import { Test, TestingModule } from '@nestjs/testing';

import { QrController } from './qr.controller';
import { QrService } from './qr.service';

import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

describe('QrController', () => {
  let controller: QrController;

  const qrService = {
    createForAsset: jest.fn(),
    validate: jest.fn(),
    findByAssetId: jest.fn(),
    regenerateForAsset: jest.fn(),
    deactivate: jest.fn(),
    activate: jest.fn(),
  };

  const user: AuthenticatedUser = {
    id: 'user-1',
  } as AuthenticatedUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QrController],
      providers: [
        {
          provide: QrService,
          useValue: qrService,
        },
      ],
    }).compile();

    controller = module.get<QrController>(QrController);

    jest.clearAllMocks();
  });

  // ============================================================= //
  // CREATE
  // ============================================================= //

  describe('createForAsset', () => {
    it("should create a QR code for the current user's asset", async () => {
      const assetId = 'asset-1';

      const expectedResult = {
        id: 'qr-1',
        token: 'ATR_test-token',
        url: 'https://airtracer.local/qr/ATR_test-token',
      };

      qrService.createForAsset.mockResolvedValue(expectedResult);

      const result = await controller.createForAsset(assetId, user);

      expect(qrService.createForAsset).toHaveBeenCalledWith(assetId, user.id);

      expect(result).toEqual(expectedResult);
    });
  });

  // ============================================================= //
  // FIND BY TOKEN
  // ============================================================= //

  describe('findByToken', () => {
    it('should validate the QR token', async () => {
      const token = 'ATR_test-token';

      const expectedResult = {
        id: 'qr-1',
        token,
        isActive: true,
        asset: {
          id: 'asset-1',
        },
      };

      qrService.validate.mockResolvedValue(expectedResult);

      const result = await controller.findByToken(token);

      expect(qrService.validate).toHaveBeenCalledWith(token);

      expect(result).toEqual(expectedResult);
    });
  });

  // ============================================================= //
  // FIND BY ASSET ID
  // ============================================================= //

  describe('findByAssetId', () => {
    it('should return the QR code belonging to an asset', async () => {
      const assetId = 'asset-1';

      const expectedResult = {
        id: 'qr-1',
        token: 'ATR_test-token',
        assetId,
        isActive: true,
      };

      qrService.findByAssetId.mockResolvedValue(expectedResult);

      const result = await controller.findByAssetId(assetId);

      expect(qrService.findByAssetId).toHaveBeenCalledWith(assetId);

      expect(result).toEqual(expectedResult);
    });
  });

  // ============================================================= //
  // REGENERATE
  // ============================================================= //

  describe('regenerate', () => {
    it("should regenerate the QR code for the current user's asset", async () => {
      const assetId = 'asset-1';

      const expectedResult = {
        id: 'qr-1',
        token: 'ATR_new-token',
        url: 'https://airtracer.local/qr/ATR_new-token',
      };

      qrService.regenerateForAsset.mockResolvedValue(expectedResult);

      const result = await controller.regenerate(assetId, user);

      expect(qrService.regenerateForAsset).toHaveBeenCalledWith(
        assetId,
        user.id,
      );

      expect(result).toEqual(expectedResult);
    });
  });

  // ============================================================= //
  // DEACTIVATE
  // ============================================================= //

  describe('deactivate', () => {
    it("should deactivate the QR code for the current user's asset", async () => {
      const token = 'ATR_test-token';

      const expectedResult = {
        id: 'qr-1',
        token,
        isActive: false,
      };

      qrService.deactivate.mockResolvedValue(expectedResult);

      const result = await controller.deactivate(token, user);

      expect(qrService.deactivate).toHaveBeenCalledWith(token, user.id);

      expect(result).toEqual(expectedResult);
    });
  });

  // ============================================================= //
  // ACTIVATE
  // ============================================================= //

  describe('activate', () => {
    it("should activate the QR code for the current user's asset", async () => {
      const token = 'ATR_test-token';

      const expectedResult = {
        id: 'qr-1',
        token,
        isActive: true,
      };

      qrService.activate.mockResolvedValue(expectedResult);

      const result = await controller.activate(token, user);

      expect(qrService.activate).toHaveBeenCalledWith(token, user.id);

      expect(result).toEqual(expectedResult);
    });
  });

  // ============================================================= //
  // CONTROLLER
  // ============================================================= //

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
