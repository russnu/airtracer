import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { QrService } from './qr.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

import { generateQrToken } from './utils/qr.util';

jest.mock('./utils/qr.util', () => ({
  generateQrToken: jest.fn(),
}));

describe('QrService', () => {
  let service: QrService;

  const prisma = {
    asset: {
      findUnique: jest.fn(),
    },
    qRCode: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const configService = {
    getOrThrow: jest.fn(),
  };

  const mockedGenerateQrToken = generateQrToken as jest.MockedFunction<
    typeof generateQrToken
  >;

  const ownerId = 'user-owner-1';
  const otherUserId = 'user-other-1';
  const assetId = 'asset-1';
  const token = 'ATR_test-token';

  const asset = {
    id: assetId,
    brand: 'Daikin',
    model: 'FTKF35',
    serialNumber: 'DAIKIN-001',
    installationDate: new Date('2025-01-15'),
    location: 'Living Room',
    ownerId,
    qrCode: null,
  };

  const qrCode = {
    id: 'qr-1',
    token,
    assetId,
    isActive: true,
    generatedAt: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    asset,
  };

  beforeEach(async () => {
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

    configService.getOrThrow.mockReturnValue('https://airtracer.local');

    mockedGenerateQrToken.mockReturnValue(token);
  });

  // ============================================================= //
  // CREATE FOR ASSET
  // ============================================================= //

  describe('createForAsset', () => {
    it('should create a QR code for an owned asset', async () => {
      prisma.asset.findUnique.mockResolvedValue({
        ...asset,
        qrCode: null,
      });

      prisma.qRCode.create.mockResolvedValue(qrCode);

      const result = await service.createForAsset(assetId, ownerId);

      expect(prisma.asset.findUnique).toHaveBeenCalledWith({
        where: {
          id: assetId,
        },
        include: {
          qrCode: true,
        },
      });

      expect(mockedGenerateQrToken).toHaveBeenCalled();

      expect(prisma.qRCode.create).toHaveBeenCalledWith({
        data: {
          token,
          assetId,
        },
        include: {
          asset: true,
        },
      });

      expect(result).toEqual({
        id: qrCode.id,
        token: qrCode.token,
        url: `https://airtracer.local/qr/${token}`,
        asset: qrCode.asset,
      });
    });

    it('should throw NotFoundException if the asset does not exist', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);

      await expect(service.createForAsset(assetId, ownerId)).rejects.toThrow(
        new NotFoundException('Asset not found'),
      );

      expect(prisma.qRCode.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if the user does not own the asset', async () => {
      prisma.asset.findUnique.mockResolvedValue({
        ...asset,
        ownerId: otherUserId,
        qrCode: null,
      });

      await expect(service.createForAsset(assetId, ownerId)).rejects.toThrow(
        new ForbiddenException('You do not own this asset.'),
      );

      expect(prisma.qRCode.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if the asset already has a QR code', async () => {
      prisma.asset.findUnique.mockResolvedValue({
        ...asset,
        qrCode,
      });

      await expect(service.createForAsset(assetId, ownerId)).rejects.toThrow(
        new ConflictException('This asset already has a QR code'),
      );

      expect(prisma.qRCode.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================= //
  // FIND ASSET BY TOKEN
  // ============================================================= //

  describe('findAssetByToken', () => {
    it('should return the asset associated with the token', async () => {
      prisma.qRCode.findUnique.mockResolvedValue(qrCode);

      const result = await service.findAssetByToken(token);

      expect(prisma.qRCode.findUnique).toHaveBeenCalledWith({
        where: {
          token,
        },
        include: {
          asset: true,
        },
      });

      expect(result).toEqual(asset);
    });

    it('should throw NotFoundException if the QR code does not exist', async () => {
      prisma.qRCode.findUnique.mockResolvedValue(null);

      await expect(service.findAssetByToken(token)).rejects.toThrow(
        new NotFoundException('QR code not found'),
      );
    });
  });

  // ============================================================= //
  // VALIDATE
  // ============================================================= //

  describe('validate', () => {
    it('should return an active QR code', async () => {
      prisma.qRCode.findUnique.mockResolvedValue({
        ...qrCode,
        isActive: true,
      });

      const result = await service.validate(token);

      expect(prisma.qRCode.findUnique).toHaveBeenCalledWith({
        where: {
          token,
        },
        include: {
          asset: true,
        },
      });

      expect(result).toEqual({
        ...qrCode,
        isActive: true,
      });
    });

    it('should throw NotFoundException if the QR code does not exist', async () => {
      prisma.qRCode.findUnique.mockResolvedValue(null);

      await expect(service.validate(token)).rejects.toThrow(
        new NotFoundException('QR code not found'),
      );
    });

    it('should throw ConflictException if the QR code is inactive', async () => {
      prisma.qRCode.findUnique.mockResolvedValue({
        ...qrCode,
        isActive: false,
      });

      await expect(service.validate(token)).rejects.toThrow(
        new ConflictException('QR code is inactive'),
      );
    });
  });

  // ============================================================= //
  // DEACTIVATE
  // ============================================================= //

  describe('deactivate', () => {
    it('should deactivate an owned QR code', async () => {
      prisma.qRCode.findUnique.mockResolvedValue({
        ...qrCode,
        asset: {
          ownerId,
        },
      });

      const updatedQrCode = {
        ...qrCode,
        isActive: false,
      };

      prisma.qRCode.update.mockResolvedValue(updatedQrCode);

      const result = await service.deactivate(token, ownerId);

      expect(prisma.qRCode.findUnique).toHaveBeenCalledWith({
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

      expect(prisma.qRCode.update).toHaveBeenCalledWith({
        where: {
          token,
        },
        data: {
          isActive: false,
        },
      });

      expect(result).toEqual(updatedQrCode);
    });

    it('should throw NotFoundException if the QR code does not exist', async () => {
      prisma.qRCode.findUnique.mockResolvedValue(null);

      await expect(service.deactivate(token, ownerId)).rejects.toThrow(
        new NotFoundException('QR code not found'),
      );

      expect(prisma.qRCode.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if the user does not own the QR asset', async () => {
      prisma.qRCode.findUnique.mockResolvedValue({
        ...qrCode,
        asset: {
          ownerId: otherUserId,
        },
      });

      await expect(service.deactivate(token, ownerId)).rejects.toThrow(
        new ForbiddenException(
          'You do not own the asset associated with this QR code',
        ),
      );

      expect(prisma.qRCode.update).not.toHaveBeenCalled();
    });
  });

  // ============================================================= //
  // ACTIVATE
  // ============================================================= //

  describe('activate', () => {
    it('should activate an owned QR code', async () => {
      prisma.qRCode.findUnique.mockResolvedValue({
        ...qrCode,
        isActive: false,
        asset: {
          ownerId,
        },
      });

      const updatedQrCode = {
        ...qrCode,
        isActive: true,
      };

      prisma.qRCode.update.mockResolvedValue(updatedQrCode);

      const result = await service.activate(token, ownerId);

      expect(prisma.qRCode.findUnique).toHaveBeenCalledWith({
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

      expect(prisma.qRCode.update).toHaveBeenCalledWith({
        where: {
          token,
        },
        data: {
          isActive: true,
        },
      });

      expect(result).toEqual(updatedQrCode);
    });

    it('should throw NotFoundException if the QR code does not exist', async () => {
      prisma.qRCode.findUnique.mockResolvedValue(null);

      await expect(service.activate(token, ownerId)).rejects.toThrow(
        new NotFoundException('QR code not found'),
      );

      expect(prisma.qRCode.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if the user does not own the QR asset', async () => {
      prisma.qRCode.findUnique.mockResolvedValue({
        ...qrCode,
        asset: {
          ownerId: otherUserId,
        },
      });

      await expect(service.activate(token, ownerId)).rejects.toThrow(
        new ForbiddenException(
          'You do not own the asset associated with this QR code',
        ),
      );

      expect(prisma.qRCode.update).not.toHaveBeenCalled();
    });
  });

  // ============================================================= //
  // REGENERATE
  // ============================================================= //

  describe('regenerateForAsset', () => {
    it('should regenerate the QR code for an owned asset', async () => {
      const oldToken = 'ATR_old-token';
      const newToken = 'ATR_new-token';

      prisma.asset.findUnique.mockResolvedValue({
        ...asset,
        qrCode,
      });

      prisma.qRCode.findUnique.mockResolvedValue({
        ...qrCode,
        token: oldToken,
      });

      mockedGenerateQrToken.mockReturnValue(newToken);

      const updatedQrCode = {
        ...qrCode,
        token: newToken,
        isActive: true,
      };

      prisma.qRCode.update.mockResolvedValue(updatedQrCode);

      const result = await service.regenerateForAsset(assetId, ownerId);

      expect(prisma.asset.findUnique).toHaveBeenCalledWith({
        where: {
          id: assetId,
        },
        include: {
          qrCode: true,
        },
      });

      expect(prisma.qRCode.findUnique).toHaveBeenCalledWith({
        where: {
          assetId,
        },
      });

      expect(mockedGenerateQrToken).toHaveBeenCalled();

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
        id: updatedQrCode.id,
        token: newToken,
        url: `https://airtracer.local/qr/${newToken}`,
        asset: updatedQrCode.asset,
      });
    });

    it('should throw NotFoundException if the asset does not exist', async () => {
      prisma.asset.findUnique.mockResolvedValue(null);

      await expect(
        service.regenerateForAsset(assetId, ownerId),
      ).rejects.toThrow(new NotFoundException('Asset not found'));

      expect(prisma.qRCode.findUnique).not.toHaveBeenCalled();
      expect(prisma.qRCode.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if the user does not own the asset', async () => {
      prisma.asset.findUnique.mockResolvedValue({
        ...asset,
        ownerId: otherUserId,
        qrCode,
      });

      await expect(
        service.regenerateForAsset(assetId, ownerId),
      ).rejects.toThrow(new ForbiddenException('You do not own this asset.'));

      expect(prisma.qRCode.findUnique).not.toHaveBeenCalled();
      expect(prisma.qRCode.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if the asset has no QR code', async () => {
      prisma.asset.findUnique.mockResolvedValue({
        ...asset,
        qrCode: null,
      });

      prisma.qRCode.findUnique.mockResolvedValue(null);

      await expect(
        service.regenerateForAsset(assetId, ownerId),
      ).rejects.toThrow(
        new NotFoundException('QR code not found for this asset'),
      );

      expect(prisma.qRCode.update).not.toHaveBeenCalled();
    });
  });

  // ============================================================= //
  // FIND BY ASSET ID
  // ============================================================= //

  describe('findByAssetId', () => {
    it('should return the QR code belonging to an asset', async () => {
      prisma.qRCode.findUnique.mockResolvedValue(qrCode);

      const result = await service.findByAssetId(assetId);

      expect(prisma.qRCode.findUnique).toHaveBeenCalledWith({
        where: {
          assetId,
        },
        include: {
          asset: true,
        },
      });

      expect(result).toEqual(qrCode);
    });

    it('should throw NotFoundException if the asset has no QR code', async () => {
      prisma.qRCode.findUnique.mockResolvedValue(null);

      await expect(service.findByAssetId(assetId)).rejects.toThrow(
        new NotFoundException('QR code not found for this asset'),
      );
    });
  });
});
