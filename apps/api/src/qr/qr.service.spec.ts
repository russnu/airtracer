import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { QrService } from './qr.service';
import { PrismaService } from '../prisma/prisma.service';
import { generateQrToken } from './utils/qr.util';

jest.mock('./utils/qr.util', () => ({
  generateQrToken: jest.fn(),
}));

describe('QrService', () => {
  let service: QrService;

  const prismaMock = {
    asset: {
      findUnique: jest.fn(),
    },
    qRCode: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const configServiceMock = {
    getOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    configServiceMock.getOrThrow.mockReturnValue('https://airtracer.local');
    (generateQrToken as jest.Mock).mockReturnValue('ATR_TEST_TOKEN');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<QrService>(QrService);
  });

  // ---------------------------------------------------------------------------
  // createForAsset
  // ---------------------------------------------------------------------------

  describe('createForAsset', () => {
    const assetId = 'asset-1';
    const userId = 'user-1';

    const asset = {
      id: assetId,
      name: 'Laptop',
      ownerId: userId,
      qrCode: null,
    };

    const createdQrCode = {
      id: 'qr-1',
      token: 'ATR_TEST_TOKEN',
      assetId,
      isActive: true,
      generatedAt: new Date(),
      asset,
    };

    it('should create a QR code for the owner when the asset has no QR code', async () => {
      prismaMock.asset.findUnique.mockResolvedValue(asset);
      prismaMock.qRCode.create.mockResolvedValue(createdQrCode);

      const result = await service.createForAsset(assetId, userId);

      expect(prismaMock.asset.findUnique).toHaveBeenCalledWith({
        where: {
          id: assetId,
        },
        include: {
          qrCode: true,
        },
      });

      expect(generateQrToken).toHaveBeenCalled();

      expect(prismaMock.qRCode.create).toHaveBeenCalledWith({
        data: {
          token: 'ATR_TEST_TOKEN',
          assetId,
        },
        include: {
          asset: true,
        },
      });

      expect(configServiceMock.getOrThrow).toHaveBeenCalledWith('QR_BASE_URL');

      expect(result).toEqual({
        id: 'qr-1',
        token: 'ATR_TEST_TOKEN',
        url: 'https://airtracer.local/qr/ATR_TEST_TOKEN',
        asset,
      });
    });

    it('should throw NotFoundException when the asset does not exist', async () => {
      prismaMock.asset.findUnique.mockResolvedValue(null);

      await expect(service.createForAsset(assetId, userId)).rejects.toThrow(
        new NotFoundException('Asset not found'),
      );

      expect(prismaMock.qRCode.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the user does not own the asset', async () => {
      prismaMock.asset.findUnique.mockResolvedValue({
        ...asset,
        ownerId: 'another-user',
      });

      await expect(service.createForAsset(assetId, userId)).rejects.toThrow(
        new ForbiddenException('You do not own this asset.'),
      );

      expect(prismaMock.qRCode.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the asset already has a QR code', async () => {
      const existingQrCode = {
        id: 'qr-existing',
        token: 'ATR_EXISTING',
      };

      prismaMock.asset.findUnique.mockResolvedValue({
        ...asset,
        qrCode: existingQrCode,
      });

      await expect(service.createForAsset(assetId, userId)).rejects.toThrow(
        new ConflictException('This asset already has a QR code'),
      );

      expect(generateQrToken).not.toHaveBeenCalled();
      expect(prismaMock.qRCode.create).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // findAssetByToken
  // ---------------------------------------------------------------------------

  describe('findAssetByToken', () => {
    const token = 'ATR_TEST_TOKEN';

    const asset = {
      id: 'asset-1',
      name: 'Laptop',
      ownerId: 'user-1',
    };

    it('should return the asset associated with the QR token', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue({
        id: 'qr-1',
        token,
        asset,
      });

      const result = await service.findAssetByToken(token);

      expect(prismaMock.qRCode.findUnique).toHaveBeenCalledWith({
        where: {
          token,
        },
        include: {
          asset: true,
        },
      });

      expect(result).toEqual(asset);
    });

    it('should throw NotFoundException when the QR code does not exist', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue(null);

      await expect(service.findAssetByToken(token)).rejects.toThrow(
        new NotFoundException('QR code not found'),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // validate
  // ---------------------------------------------------------------------------

  describe('validate', () => {
    const token = 'ATR_TEST_TOKEN';

    const qrCode = {
      id: 'qr-1',
      token,
      isActive: true,
      assetId: 'asset-1',
      asset: {
        id: 'asset-1',
        name: 'Laptop',
        ownerId: 'user-1',
      },
    };

    it('should return the QR code when it exists and is active', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue(qrCode);

      const result = await service.validate(token);

      expect(prismaMock.qRCode.findUnique).toHaveBeenCalledWith({
        where: {
          token,
        },
        include: {
          asset: true,
        },
      });

      expect(result).toEqual(qrCode);
    });

    it('should throw NotFoundException when the QR code does not exist', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue(null);

      await expect(service.validate(token)).rejects.toThrow(
        new NotFoundException('QR code not found'),
      );
    });

    it('should throw ConflictException when the QR code is inactive', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue({
        ...qrCode,
        isActive: false,
      });

      await expect(service.validate(token)).rejects.toThrow(
        new ConflictException('QR code is inactive'),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // deactivate
  // ---------------------------------------------------------------------------

  describe('deactivate', () => {
    const token = 'ATR_TEST_TOKEN';
    const userId = 'user-1';

    const qrCode = {
      id: 'qr-1',
      token,
      asset: {
        ownerId: userId,
      },
    };

    const updatedQrCode = {
      id: 'qr-1',
      token,
      assetId: 'asset-1',
      isActive: false,
    };

    it('should deactivate the QR code when the user owns the asset', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue(qrCode);
      prismaMock.qRCode.update.mockResolvedValue(updatedQrCode);

      const result = await service.deactivate(token, userId);

      expect(prismaMock.qRCode.findUnique).toHaveBeenCalledWith({
        where: {
          token,
        },
        include: {
          asset: {
            select: {
              ownerId: true,
            },
          },
        },
      });

      expect(prismaMock.qRCode.update).toHaveBeenCalledWith({
        where: {
          token,
        },
        data: {
          isActive: false,
        },
      });

      expect(result).toEqual(updatedQrCode);
    });

    it('should throw NotFoundException when the QR code does not exist', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue(null);

      await expect(service.deactivate(token, userId)).rejects.toThrow(
        new NotFoundException('QR code not found'),
      );

      expect(prismaMock.qRCode.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the user does not own the asset', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue({
        ...qrCode,
        asset: {
          ownerId: 'another-user',
        },
      });

      await expect(service.deactivate(token, userId)).rejects.toThrow(
        new ForbiddenException(
          'You do not own the asset associated with this QR code',
        ),
      );

      expect(prismaMock.qRCode.update).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // activate
  // ---------------------------------------------------------------------------

  describe('activate', () => {
    const token = 'ATR_TEST_TOKEN';
    const userId = 'user-1';

    const qrCode = {
      id: 'qr-1',
      token,
      asset: {
        ownerId: userId,
      },
    };

    const updatedQrCode = {
      id: 'qr-1',
      token,
      assetId: 'asset-1',
      isActive: true,
    };

    it('should activate the QR code when the user owns the asset', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue(qrCode);
      prismaMock.qRCode.update.mockResolvedValue(updatedQrCode);

      const result = await service.activate(token, userId);

      expect(prismaMock.qRCode.findUnique).toHaveBeenCalledWith({
        where: {
          token,
        },
        include: {
          asset: {
            select: {
              ownerId: true,
            },
          },
        },
      });

      expect(prismaMock.qRCode.update).toHaveBeenCalledWith({
        where: {
          token,
        },
        data: {
          isActive: true,
        },
      });

      expect(result).toEqual(updatedQrCode);
    });

    it('should throw NotFoundException when the QR code does not exist', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue(null);

      await expect(service.activate(token, userId)).rejects.toThrow(
        new NotFoundException('QR code not found'),
      );

      expect(prismaMock.qRCode.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the user does not own the asset', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue({
        ...qrCode,
        asset: {
          ownerId: 'another-user',
        },
      });

      await expect(service.activate(token, userId)).rejects.toThrow(
        new ForbiddenException(
          'You do not own the asset associated with this QR code',
        ),
      );

      expect(prismaMock.qRCode.update).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // regenerateForAsset
  // ---------------------------------------------------------------------------

  describe('regenerateForAsset', () => {
    const assetId = 'asset-1';
    const userId = 'user-1';

    const asset = {
      id: assetId,
      name: 'Laptop',
      ownerId: userId,
      qrCode: {
        id: 'qr-1',
        token: 'ATR_OLD_TOKEN',
      },
    };

    const existingQrCode = {
      id: 'qr-1',
      token: 'ATR_OLD_TOKEN',
      assetId,
      isActive: false,
    };

    const updatedQrCode = {
      id: 'qr-1',
      token: 'ATR_NEW_TOKEN',
      assetId,
      isActive: true,
      generatedAt: new Date(),
      asset,
    };

    it('should regenerate the QR code for the asset owner', async () => {
      prismaMock.asset.findUnique.mockResolvedValue(asset);
      prismaMock.qRCode.findUnique.mockResolvedValue(existingQrCode);
      (generateQrToken as jest.Mock).mockReturnValue('ATR_NEW_TOKEN');
      prismaMock.qRCode.update.mockResolvedValue(updatedQrCode);

      const result = await service.regenerateForAsset(assetId, userId);

      expect(prismaMock.asset.findUnique).toHaveBeenCalledWith({
        where: {
          id: assetId,
        },
        include: {
          qrCode: true,
        },
      });

      expect(prismaMock.qRCode.findUnique).toHaveBeenCalledWith({
        where: {
          assetId,
        },
      });

      expect(generateQrToken).toHaveBeenCalled();

      expect(prismaMock.qRCode.update).toHaveBeenCalledWith({
        where: {
          assetId,
        },
        data: {
          token: 'ATR_NEW_TOKEN',
          isActive: true,
          generatedAt: expect.any(Date),
        },
        include: {
          asset: true,
        },
      });

      expect(result).toEqual({
        id: 'qr-1',
        token: 'ATR_NEW_TOKEN',
        url: 'https://airtracer.local/qr/ATR_NEW_TOKEN',
        asset,
      });
    });

    it('should throw NotFoundException when the asset does not exist', async () => {
      prismaMock.asset.findUnique.mockResolvedValue(null);

      await expect(service.regenerateForAsset(assetId, userId)).rejects.toThrow(
        new NotFoundException('Asset not found'),
      );

      expect(prismaMock.qRCode.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.qRCode.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the user does not own the asset', async () => {
      prismaMock.asset.findUnique.mockResolvedValue({
        ...asset,
        ownerId: 'another-user',
      });

      await expect(service.regenerateForAsset(assetId, userId)).rejects.toThrow(
        new ForbiddenException('You do not own this asset.'),
      );

      expect(prismaMock.qRCode.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.qRCode.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the asset has no QR code', async () => {
      prismaMock.asset.findUnique.mockResolvedValue({
        ...asset,
        qrCode: null,
      });

      prismaMock.qRCode.findUnique.mockResolvedValue(null);

      await expect(service.regenerateForAsset(assetId, userId)).rejects.toThrow(
        new NotFoundException('QR code not found for this asset'),
      );

      expect(generateQrToken).not.toHaveBeenCalled();
      expect(prismaMock.qRCode.update).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // findByAssetId
  // ---------------------------------------------------------------------------

  describe('findByAssetId', () => {
    const assetId = 'asset-1';

    const qrCode = {
      id: 'qr-1',
      token: 'ATR_TEST_TOKEN',
      assetId,
      isActive: true,
      asset: {
        id: assetId,
        name: 'Laptop',
        ownerId: 'user-1',
      },
    };

    it('should return the QR code belonging to the asset', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue(qrCode);

      const result = await service.findByAssetId(assetId);

      expect(prismaMock.qRCode.findUnique).toHaveBeenCalledWith({
        where: {
          assetId,
        },
        include: {
          asset: true,
        },
      });

      expect(result).toEqual(qrCode);
    });

    it('should throw NotFoundException when the asset has no QR code', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue(null);

      await expect(service.findByAssetId(assetId)).rejects.toThrow(
        new NotFoundException('QR code not found for this asset'),
      );
    });
  });
});
