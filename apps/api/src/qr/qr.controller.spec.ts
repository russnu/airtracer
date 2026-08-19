import { Test, TestingModule } from '@nestjs/testing';

import { QrController } from './qr.controller';
import { QrService } from './qr.service';

import { RoleName } from '../roles/enums/role-name.enum';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';

describe('QrController', () => {
  let controller: QrController;

  const qrServiceMock = {
    createForAsset: jest.fn(),
    validate: jest.fn(),
    findByAssetId: jest.fn(),
    regenerateForAsset: jest.fn(),
    deactivate: jest.fn(),
    activate: jest.fn(),
  };

  const authenticatedUser = {
    id: 'user-1',
  } as AuthenticatedUser;

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

  // ---------------------------------------------------------------------------
  // createForAsset
  // ---------------------------------------------------------------------------

  describe('createForAsset', () => {
    it('should call qrService.createForAsset with asset ID and user ID', async () => {
      const assetId = 'asset-1';

      const expectedResult = {
        id: 'qr-1',
        token: 'ATR_TEST_TOKEN',
        url: 'https://airtracer.local/qr/ATR_TEST_TOKEN',
      };

      qrServiceMock.createForAsset.mockResolvedValue(expectedResult);

      const result = await controller.createForAsset(
        assetId,
        authenticatedUser,
      );

      expect(qrServiceMock.createForAsset).toHaveBeenCalledWith(
        assetId,
        authenticatedUser.id,
      );

      expect(result).toEqual(expectedResult);
    });

    it('should propagate the service error', async () => {
      const error = new Error('Asset not found');

      qrServiceMock.createForAsset.mockRejectedValue(error);

      await expect(
        controller.createForAsset('asset-1', authenticatedUser),
      ).rejects.toThrow(error);

      expect(qrServiceMock.createForAsset).toHaveBeenCalledWith(
        'asset-1',
        authenticatedUser.id,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findByToken
  // ---------------------------------------------------------------------------

  describe('findByToken', () => {
    it('should call qrService.validate with the token', async () => {
      const token = 'ATR_TEST_TOKEN';

      const expectedResult = {
        id: 'qr-1',
        token,
        isActive: true,
        asset: {
          id: 'asset-1',
        },
      };

      qrServiceMock.validate.mockResolvedValue(expectedResult);

      const result = await controller.findByToken(token);

      expect(qrServiceMock.validate).toHaveBeenCalledWith(token);

      expect(result).toEqual(expectedResult);
    });

    it('should not call any other QR service method', async () => {
      await controller.findByToken('ATR_TEST_TOKEN');

      expect(qrServiceMock.validate).toHaveBeenCalledTimes(1);
      expect(qrServiceMock.findByAssetId).not.toHaveBeenCalled();
      expect(qrServiceMock.createForAsset).not.toHaveBeenCalled();
      expect(qrServiceMock.regenerateForAsset).not.toHaveBeenCalled();
      expect(qrServiceMock.deactivate).not.toHaveBeenCalled();
      expect(qrServiceMock.activate).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // findByAssetId
  // ---------------------------------------------------------------------------

  describe('findByAssetId', () => {
    it('should call qrService.findByAssetId with the asset ID', async () => {
      const assetId = 'asset-1';

      const expectedResult = {
        id: 'qr-1',
        token: 'ATR_TEST_TOKEN',
        assetId,
        isActive: true,
      };

      qrServiceMock.findByAssetId.mockResolvedValue(expectedResult);

      const result = await controller.findByAssetId(assetId);

      expect(qrServiceMock.findByAssetId).toHaveBeenCalledWith(assetId);

      expect(result).toEqual(expectedResult);
    });

    it('should propagate the service error', async () => {
      const error = new Error('QR code not found for this asset');

      qrServiceMock.findByAssetId.mockRejectedValue(error);

      await expect(controller.findByAssetId('asset-1')).rejects.toThrow(error);

      expect(qrServiceMock.findByAssetId).toHaveBeenCalledWith('asset-1');
    });
  });

  // ---------------------------------------------------------------------------
  // regenerate
  // ---------------------------------------------------------------------------

  describe('regenerate', () => {
    it('should call qrService.regenerateForAsset with asset ID and user ID', async () => {
      const assetId = 'asset-1';

      const expectedResult = {
        id: 'qr-1',
        token: 'ATR_NEW_TOKEN',
        url: 'https://airtracer.local/qr/ATR_NEW_TOKEN',
        asset: {
          id: assetId,
        },
      };

      qrServiceMock.regenerateForAsset.mockResolvedValue(expectedResult);

      const result = await controller.regenerate(assetId, authenticatedUser);

      expect(qrServiceMock.regenerateForAsset).toHaveBeenCalledWith(
        assetId,
        authenticatedUser.id,
      );

      expect(result).toEqual(expectedResult);
    });

    it('should propagate the service error', async () => {
      const error = new Error('QR code not found for this asset');

      qrServiceMock.regenerateForAsset.mockRejectedValue(error);

      await expect(
        controller.regenerate('asset-1', authenticatedUser),
      ).rejects.toThrow(error);

      expect(qrServiceMock.regenerateForAsset).toHaveBeenCalledWith(
        'asset-1',
        authenticatedUser.id,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // deactivate
  // ---------------------------------------------------------------------------

  describe('deactivate', () => {
    it('should call qrService.deactivate with token and user ID', async () => {
      const token = 'ATR_TEST_TOKEN';

      const expectedResult = {
        id: 'qr-1',
        token,
        isActive: false,
      };

      qrServiceMock.deactivate.mockResolvedValue(expectedResult);

      const result = await controller.deactivate(token, authenticatedUser);

      expect(qrServiceMock.deactivate).toHaveBeenCalledWith(
        token,
        authenticatedUser.id,
      );

      expect(result).toEqual(expectedResult);
    });

    it('should propagate the service error', async () => {
      const error = new Error(
        'You do not own the asset associated with this QR code',
      );

      qrServiceMock.deactivate.mockRejectedValue(error);

      await expect(
        controller.deactivate('ATR_TEST_TOKEN', authenticatedUser),
      ).rejects.toThrow(error);

      expect(qrServiceMock.deactivate).toHaveBeenCalledWith(
        'ATR_TEST_TOKEN',
        authenticatedUser.id,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // activate
  // ---------------------------------------------------------------------------

  describe('activate', () => {
    it('should call qrService.activate with token and user ID', async () => {
      const token = 'ATR_TEST_TOKEN';

      const expectedResult = {
        id: 'qr-1',
        token,
        isActive: true,
      };

      qrServiceMock.activate.mockResolvedValue(expectedResult);

      const result = await controller.activate(token, authenticatedUser);

      expect(qrServiceMock.activate).toHaveBeenCalledWith(
        token,
        authenticatedUser.id,
      );

      expect(result).toEqual(expectedResult);
    });

    it('should propagate the service error', async () => {
      const error = new Error(
        'You do not own the asset associated with this QR code',
      );

      qrServiceMock.activate.mockRejectedValue(error);

      await expect(
        controller.activate('ATR_TEST_TOKEN', authenticatedUser),
      ).rejects.toThrow(error);

      expect(qrServiceMock.activate).toHaveBeenCalledWith(
        'ATR_TEST_TOKEN',
        authenticatedUser.id,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Controller metadata
  // ---------------------------------------------------------------------------

  describe('route metadata', () => {
    it('should define OWNER role for createForAsset', () => {
      const roles = Reflect.getMetadata(
        'roles',
        QrController.prototype.createForAsset,
      );

      expect(roles).toEqual([RoleName.OWNER]);
    });

    it('should define OWNER role for regenerate', () => {
      const roles = Reflect.getMetadata(
        'roles',
        QrController.prototype.regenerate,
      );

      expect(roles).toEqual([RoleName.OWNER]);
    });

    it('should define OWNER role for deactivate', () => {
      const roles = Reflect.getMetadata(
        'roles',
        QrController.prototype.deactivate,
      );

      expect(roles).toEqual([RoleName.OWNER]);
    });

    it('should define OWNER role for activate', () => {
      const roles = Reflect.getMetadata(
        'roles',
        QrController.prototype.activate,
      );

      expect(roles).toEqual([RoleName.OWNER]);
    });

    it('should not define OWNER role for findByToken', () => {
      const roles = Reflect.getMetadata(
        'roles',
        QrController.prototype.findByToken,
      );

      expect(roles).toBeUndefined();
    });

    it('should not define OWNER role for findByAssetId', () => {
      const roles = Reflect.getMetadata(
        'roles',
        QrController.prototype.findByAssetId,
      );

      expect(roles).toBeUndefined();
    });

    it('should mark findByToken as public', () => {
      const isPublic = Reflect.getMetadata(
        'isPublic',
        QrController.prototype.findByToken,
      );

      expect(isPublic).toBe(true);
    });
  });
});
