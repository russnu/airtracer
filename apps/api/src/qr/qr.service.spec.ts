import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { QrService } from './qr.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { generateQrToken } from './utils/qr.util';

jest.mock('./utils/qr.util', () => ({
  generateQrToken: jest.fn(),
}));

describe('QrService', () => {
  let service: QrService;
  let prisma: {
    asset: {
      findUnique: jest.Mock;
    };
    qRCode: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let configService: {
    getOrThrow: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      asset: {
        findUnique: jest.fn(),
      },
      qRCode: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    configService = {
      getOrThrow: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<QrService>(QrService);

    jest.clearAllMocks();
  });

  // ------------------------------------------------------------- //
  describe('createForAsset', () => {
    it('should create a QR code for an asset', async () => {
      const assetId = 'asset-1';
      const token = 'ATR_test-token';

      const asset = {
        id: assetId,
        brand: 'Daikin',
        model: 'FTKF35',
        qrCode: null,
      };

      const createdQrCode = {
        id: 'qr-1',
        token,
        assetId,
        isActive: true,
        asset,
      };

      prisma.asset.findUnique.mockResolvedValue(asset);
      prisma.qRCode.create.mockResolvedValue(createdQrCode);
      configService.getOrThrow.mockReturnValue('https://airtracer.local');
      (generateQrToken as jest.Mock).mockReturnValue(token);

      const result = await service.createForAsset(assetId);

      expect(prisma.asset.findUnique).toHaveBeenCalledWith({
        where: {
          id: assetId,
        },
        include: {
          qrCode: true,
        },
      });

      expect(generateQrToken).toHaveBeenCalled();

      expect(prisma.qRCode.create).toHaveBeenCalledWith({
        data: {
          token,
          assetId,
        },
        include: {
          asset: true,
        },
      });

      expect(configService.getOrThrow).toHaveBeenCalledWith('QR_BASE_URL');

      expect(result).toEqual({
        id: 'qr-1',
        token,
        url: `https://airtracer.local/qr/${token}`,
        asset,
      });
    });

    it('should throw NotFoundException when the asset does not exist', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);

      await expect(service.createForAsset('asset-1')).rejects.toThrow(
        new NotFoundException('Asset not found'),
      );

      expect(prisma.qRCode.create).not.toHaveBeenCalled();
      expect(generateQrToken).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the asset already has a QR code', async () => {
      const asset = {
        id: 'asset-1',
        qrCode: {
          id: 'qr-1',
          token: 'ATR_existing-token',
        },
      };

      prisma.asset.findUnique.mockResolvedValue(asset);

      await expect(service.createForAsset('asset-1')).rejects.toThrow(
        new ConflictException('This asset already has a QR code'),
      );

      expect(prisma.qRCode.create).not.toHaveBeenCalled();
      expect(generateQrToken).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------- //
  describe('findAssetByToken', () => {
    it('should return the asset associated with the QR token', async () => {
      const asset = {
        id: 'asset-1',
        brand: 'Daikin',
      };

      const qrCode = {
        id: 'qr-1',
        token: 'ATR_test-token',
        asset,
      };

      prisma.qRCode.findUnique.mockResolvedValue(qrCode);

      const result = await service.findAssetByToken('ATR_test-token');

      expect(prisma.qRCode.findUnique).toHaveBeenCalledWith({
        where: {
          token: 'ATR_test-token',
        },
        include: {
          asset: true,
        },
      });

      expect(result).toEqual(asset);
    });

    it('should throw NotFoundException when the QR code does not exist', async () => {
      prisma.qRCode.findUnique.mockResolvedValue(null);

      await expect(service.findAssetByToken('invalid-token')).rejects.toThrow(
        new NotFoundException('QR code not found'),
      );
    });
  });

  // ------------------------------------------------------------- //
  describe('validate', () => {
    it('should return the QR code when it is active', async () => {
      const qrCode = {
        id: 'qr-1',
        token: 'ATR_test-token',
        isActive: true,
        asset: {
          id: 'asset-1',
        },
      };

      prisma.qRCode.findUnique.mockResolvedValue(qrCode);

      const result = await service.validate('ATR_test-token');

      expect(result).toEqual(qrCode);
    });

    it('should throw NotFoundException when the QR code does not exist', async () => {
      prisma.qRCode.findUnique.mockResolvedValue(null);

      await expect(service.validate('invalid-token')).rejects.toThrow(
        new NotFoundException('QR code not found'),
      );
    });

    it('should throw ConflictException when the QR code is inactive', async () => {
      const qrCode = {
        id: 'qr-1',
        token: 'ATR_test-token',
        isActive: false,
        asset: {
          id: 'asset-1',
        },
      };

      prisma.qRCode.findUnique.mockResolvedValue(qrCode);

      await expect(service.validate('ATR_test-token')).rejects.toThrow(
        new ConflictException('QR code is inactive'),
      );
    });
  });

  // ------------------------------------------------------------- //
  describe('deactivate', () => {
    it('should deactivate an existing QR code', async () => {
      const qrCode = {
        id: 'qr-1',
        token: 'ATR_test-token',
        isActive: true,
      };

      const updatedQrCode = {
        ...qrCode,
        isActive: false,
      };

      prisma.qRCode.findUnique.mockResolvedValue(qrCode);
      prisma.qRCode.update.mockResolvedValue(updatedQrCode);

      const result = await service.deactivate('ATR_test-token');

      expect(prisma.qRCode.update).toHaveBeenCalledWith({
        where: {
          token: 'ATR_test-token',
        },
        data: {
          isActive: false,
        },
      });

      expect(result).toEqual(updatedQrCode);
    });

    it('should throw NotFoundException when the QR code does not exist', async () => {
      prisma.qRCode.findUnique.mockResolvedValue(null);

      await expect(service.deactivate('invalid-token')).rejects.toThrow(
        new NotFoundException('QR code not found'),
      );

      expect(prisma.qRCode.update).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------- //
  describe('activate', () => {
    it('should activate an existing QR code', async () => {
      const qrCode = {
        id: 'qr-1',
        token: 'ATR_test-token',
        isActive: false,
      };

      const updatedQrCode = {
        ...qrCode,
        isActive: true,
      };

      prisma.qRCode.findUnique.mockResolvedValue(qrCode);
      prisma.qRCode.update.mockResolvedValue(updatedQrCode);

      const result = await service.activate('ATR_test-token');

      expect(prisma.qRCode.update).toHaveBeenCalledWith({
        where: {
          token: 'ATR_test-token',
        },
        data: {
          isActive: true,
        },
      });

      expect(result).toEqual(updatedQrCode);
    });

    it('should throw NotFoundException when the QR code does not exist', async () => {
      prisma.qRCode.findUnique.mockResolvedValue(null);

      await expect(service.activate('invalid-token')).rejects.toThrow(
        new NotFoundException('QR code not found'),
      );

      expect(prisma.qRCode.update).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------- //
  describe('regenerateForAsset', () => {
    it('should generate a new token and update the QR code', async () => {
      const assetId = 'asset-1';
      const oldToken = 'ATR_old-token';
      const newToken = 'ATR_new-token';

      const qrCode = {
        id: 'qr-1',
        assetId,
        token: oldToken,
        isActive: false,
      };

      const asset = {
        id: assetId,
        brand: 'Daikin',
      };

      const updatedQrCode = {
        ...qrCode,
        token: newToken,
        isActive: true,
        asset,
      };

      prisma.qRCode.findUnique.mockResolvedValue(qrCode);
      prisma.qRCode.update.mockResolvedValue(updatedQrCode);
      configService.getOrThrow.mockReturnValue('https://airtracer.local');
      (generateQrToken as jest.Mock).mockReturnValue(newToken);

      const result = await service.regenerateForAsset(assetId);

      expect(generateQrToken).toHaveBeenCalled();

      expect(prisma.qRCode.update).toHaveBeenCalledWith({
        where: {
          assetId,
        },
        data: {
          token: newToken,
          isActive: true,
          generatedAt: expect.any(Date),
        },
        include: {
          asset: true,
        },
      });

      expect(result).toEqual({
        id: 'qr-1',
        token: newToken,
        url: `https://airtracer.local/qr/${newToken}`,
        asset,
      });
    });

    it('should throw NotFoundException when the asset has no QR code', async () => {
      prisma.qRCode.findUnique.mockResolvedValue(null);

      await expect(service.regenerateForAsset('asset-1')).rejects.toThrow(
        new NotFoundException('QR code not found for this asset'),
      );

      expect(prisma.qRCode.update).not.toHaveBeenCalled();
      expect(generateQrToken).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------- //
  describe('findByAssetId', () => {
    it('should return the QR code associated with an asset', async () => {
      const qrCode = {
        id: 'qr-1',
        assetId: 'asset-1',
        token: 'ATR_test-token',
        isActive: true,
        asset: {
          id: 'asset-1',
          brand: 'Daikin',
        },
      };

      prisma.qRCode.findUnique.mockResolvedValue(qrCode);

      const result = await service.findByAssetId('asset-1');

      expect(prisma.qRCode.findUnique).toHaveBeenCalledWith({
        where: {
          assetId: 'asset-1',
        },
        include: {
          asset: true,
        },
      });

      expect(result).toEqual(qrCode);
    });

    it('should throw NotFoundException when the asset has no QR code', async () => {
      prisma.qRCode.findUnique.mockResolvedValue(null);

      await expect(service.findByAssetId('asset-1')).rejects.toThrow(
        new NotFoundException('QR code not found for this asset'),
      );
    });
  });

  // ------------------------------------------------------------- //
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
