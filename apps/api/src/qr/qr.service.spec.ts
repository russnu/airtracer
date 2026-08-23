import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { QrService } from './qr.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

import { Event } from '../../generated/prisma/client';

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
    $transaction: jest.fn(),
  };

  const auditServiceMock = {
    log: jest.fn(),
  };

  const configServiceMock = {
    getOrThrow: jest.fn(),
  };

  const txMock = {
    qRCode: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const ownerId = 'user-1';
  const otherUserId = 'user-2';
  const assetId = 'asset-1';
  const qrCodeId = 'qr-1';

  const token = 'ATR_test-token';
  const newToken = 'ATR_new-token';

  const generatedAt = new Date('2026-01-15T10:00:00.000Z');

  const asset = {
    id: assetId,
    brand: 'Daikin',
    model: 'FTKF35',
    serialNumber: 'SN-001',
    isActive: true,
    equipmentTypeId: 'equipment-type-1',
    refrigerant: 'R-32',
    capacity: 1.5,
    capacityUnit: 'HP',
    installationDate: new Date('2025-01-15T00:00:00.000Z'),
    location: 'Living Room',
    ownerId,
  };

  const qrCode = {
    id: qrCodeId,
    token,
    assetId,
    isActive: true,
    generatedAt,
    createdAt: generatedAt,
    updatedAt: generatedAt,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    configServiceMock.getOrThrow.mockReturnValue('https://airtracer.local');

    (generateQrToken as jest.Mock).mockReturnValue(token);

    prismaMock.$transaction.mockImplementation(async (callback) => {
      return callback(txMock);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QrService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: AuditService,
          useValue: auditServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<QrService>(QrService);
  });

  // ============================================================= //
  // CREATE FOR ASSET
  // ============================================================= //

  describe('createForAsset', () => {
    it('should create a QR code for the owner of an asset', async () => {
      const createdQrCode = {
        ...qrCode,
        asset,
      };

      prismaMock.asset.findUnique.mockResolvedValue({
        ...asset,
        qrCode: null,
      });

      txMock.qRCode.create.mockResolvedValue(createdQrCode);

      const result = await service.createForAsset(assetId, ownerId);

      expect(prismaMock.asset.findUnique).toHaveBeenCalledWith({
        where: {
          id: assetId,
        },
        include: {
          qrCode: true,
        },
      });

      expect(generateQrToken).toHaveBeenCalled();

      expect(prismaMock.$transaction).toHaveBeenCalled();

      expect(txMock.qRCode.create).toHaveBeenCalledWith({
        data: {
          token,
          assetId,
        },
        include: {
          asset: true,
        },
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        {
          actorId: ownerId,
          assetId,
          event: Event.QR_GENERATED,
          payload: {
            qrCodeId: qrCode.id,
            token: qrCode.token,
            generatedAt: qrCode.generatedAt.toISOString(),
          },
        },
        txMock,
      );

      expect(result).toEqual({
        id: qrCode.id,
        token: qrCode.token,
        url: `https://airtracer.local/qr/${token}`,
        asset,
      });
    });

    it('should throw NotFoundException when the asset does not exist', async () => {
      prismaMock.asset.findUnique.mockResolvedValue(null);

      await expect(service.createForAsset(assetId, ownerId)).rejects.toThrow(
        new NotFoundException('Asset not found'),
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(txMock.qRCode.create).not.toHaveBeenCalled();
      expect(auditServiceMock.log).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the asset belongs to another user', async () => {
      prismaMock.asset.findUnique.mockResolvedValue({
        ...asset,
        ownerId: otherUserId,
        qrCode: null,
      });

      await expect(service.createForAsset(assetId, ownerId)).rejects.toThrow(
        new ForbiddenException('You do not own this asset.'),
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(txMock.qRCode.create).not.toHaveBeenCalled();
      expect(auditServiceMock.log).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the asset already has a QR code', async () => {
      prismaMock.asset.findUnique.mockResolvedValue({
        ...asset,
        qrCode,
      });

      await expect(service.createForAsset(assetId, ownerId)).rejects.toThrow(
        new ConflictException('This asset already has a QR code'),
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(txMock.qRCode.create).not.toHaveBeenCalled();
      expect(auditServiceMock.log).not.toHaveBeenCalled();
    });
  });

  // ============================================================= //
  // FIND ASSET BY TOKEN
  // ============================================================= //

  describe('findAssetByToken', () => {
    it('should return the asset associated with the QR token', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue({
        ...qrCode,
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

  // ============================================================= //
  // GET PUBLIC PASSPORT
  // ============================================================= //

  describe('getPublicPassport', () => {
    const serviceDate = new Date('2026-02-01T10:00:00.000Z');

    const passportQrCode = {
      ...qrCode,
      isActive: true,
      asset: {
        ...asset,
        equipmentType: {
          id: 'equipment-type-1',
          name: 'Air Conditioner',
        },
        serviceRecords: [
          {
            id: 'service-1',
            serviceDate,
            serviceType: 'Preventive Maintenance',
            description: 'Routine maintenance',
            suctionPressure: 120,
            dischargePressure: 300,
            current: 5.5,
            voltage: 220,
            findings: 'Unit operating normally',
            recommendations: 'Clean filters regularly',
            technician: {
              id: 'technician-1',
              firstName: 'John',
              lastName: 'Technician',
            },
            photos: [],
          },
        ],
      },
    };

    it('should return the public asset passport', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue(passportQrCode);

      const result = await service.getPublicPassport(token);

      expect(prismaMock.qRCode.findUnique).toHaveBeenCalledWith({
        where: {
          token,
        },
        include: {
          asset: {
            include: {
              equipmentType: true,
              serviceRecords: {
                orderBy: {
                  serviceDate: 'desc',
                },
                include: {
                  technician: true,
                  photos: true,
                },
              },
            },
          },
        },
      });

      expect(result).toEqual({
        asset: {
          id: asset.id,
          brand: asset.brand,
          model: asset.model,
          serialNumber: asset.serialNumber,
          equipmentType: 'Air Conditioner',
          installationDate: asset.installationDate,
          location: asset.location,
        },
        serviceHistory: [
          {
            id: 'service-1',
            serviceDate,
            serviceType: 'Preventive Maintenance',
            description: 'Routine maintenance',
            measurements: {
              suctionPressure: 120,
              dischargePressure: 300,
              current: 5.5,
              voltage: 220,
            },
            findings: 'Unit operating normally',
            recommendations: 'Clean filters regularly',
            technician: {
              name: 'John Technician',
            },
          },
        ],
      });
    });

    it('should return null technician when a service record has no technician', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue({
        ...passportQrCode,
        asset: {
          ...passportQrCode.asset,
          serviceRecords: [
            {
              ...passportQrCode.asset.serviceRecords[0],
              technician: null,
            },
          ],
        },
      });

      const result = await service.getPublicPassport(token);

      expect(result.serviceHistory[0].technician).toBeNull();
    });

    it('should throw NotFoundException when the QR code does not exist', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue(null);

      await expect(service.getPublicPassport(token)).rejects.toThrow(
        new NotFoundException('QR code not found'),
      );
    });

    it('should throw ConflictException when the QR code is inactive', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue({
        ...passportQrCode,
        isActive: false,
      });

      await expect(service.getPublicPassport(token)).rejects.toThrow(
        new ConflictException('QR code is inactive'),
      );
    });
  });

  // ============================================================= //
  // DEACTIVATE
  // ============================================================= //

  describe('deactivate', () => {
    it('should deactivate an active QR code and create an audit log', async () => {
      const updatedQrCode = {
        ...qrCode,
        isActive: false,
      };

      prismaMock.qRCode.findUnique.mockResolvedValue({
        ...qrCode,
        asset: {
          ownerId,
        },
      });

      prismaMock.qRCode.update.mockResolvedValue(updatedQrCode);

      const result = await service.deactivate(token, ownerId);

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

      expect(prismaMock.$transaction).toHaveBeenCalled();

      /*
       * Note:
       * The current service uses this.prisma.qRCode.update()
       * rather than tx.qRCode.update().
       */
      expect(prismaMock.qRCode.update).toHaveBeenCalledWith({
        where: {
          token,
        },
        data: {
          isActive: false,
        },
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        {
          actorId: ownerId,
          assetId: qrCode.assetId,
          event: Event.QR_DEACTIVATED,
          payload: {
            qrCodeId: qrCode.id,
            previousStatus: true,
            newStatus: false,
          },
        },
        txMock,
      );

      expect(result).toEqual(updatedQrCode);
    });

    it('should throw NotFoundException when the QR code does not exist', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue(null);

      await expect(service.deactivate(token, ownerId)).rejects.toThrow(
        new NotFoundException('QR code not found'),
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(prismaMock.qRCode.update).not.toHaveBeenCalled();
      expect(auditServiceMock.log).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the QR code belongs to another user', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue({
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

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(prismaMock.qRCode.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the QR code is already inactive', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue({
        ...qrCode,
        isActive: false,
        asset: {
          ownerId,
        },
      });

      await expect(service.deactivate(token, ownerId)).rejects.toThrow(
        new ConflictException('QR code is already inactive'),
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(prismaMock.qRCode.update).not.toHaveBeenCalled();
      expect(auditServiceMock.log).not.toHaveBeenCalled();
    });
  });

  // ============================================================= //
  // ACTIVATE
  // ============================================================= //

  describe('activate', () => {
    it('should activate an inactive QR code', async () => {
      const inactiveQrCode = {
        ...qrCode,
        isActive: false,
        asset: {
          ownerId,
        },
      };

      const activatedQrCode = {
        ...qrCode,
        isActive: true,
      };

      prismaMock.qRCode.findUnique.mockResolvedValue(inactiveQrCode);

      prismaMock.qRCode.update.mockResolvedValue(activatedQrCode);

      const result = await service.activate(token, ownerId);

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

      expect(result).toEqual(activatedQrCode);
    });

    it('should throw NotFoundException when the QR code does not exist', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue(null);

      await expect(service.activate(token, ownerId)).rejects.toThrow(
        new NotFoundException('QR code not found'),
      );

      expect(prismaMock.qRCode.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the QR code belongs to another user', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue({
        ...qrCode,
        isActive: false,
        asset: {
          ownerId: otherUserId,
        },
      });

      await expect(service.activate(token, ownerId)).rejects.toThrow(
        new ForbiddenException(
          'You do not own the asset associated with this QR code',
        ),
      );

      expect(prismaMock.qRCode.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the QR code is already active', async () => {
      prismaMock.qRCode.findUnique.mockResolvedValue({
        ...qrCode,
        isActive: true,
        asset: {
          ownerId,
        },
      });

      await expect(service.activate(token, ownerId)).rejects.toThrow(
        new ConflictException('QR code is already active'),
      );

      expect(prismaMock.qRCode.update).not.toHaveBeenCalled();
    });
  });

  // ============================================================= //
  // REGENERATE FOR ASSET
  // ============================================================= //

  describe('regenerateForAsset', () => {
    it('should regenerate the QR code and create an audit log', async () => {
      const regeneratedAt = new Date('2026-02-01T10:00:00.000Z');

      const existingQrCode = {
        ...qrCode,
        token,
      };

      const updatedQrCode = {
        ...qrCode,
        token: newToken,
        isActive: true,
        generatedAt: regeneratedAt,
        asset,
      };

      prismaMock.asset.findUnique.mockResolvedValue({
        ...asset,
        qrCode: existingQrCode,
      });

      prismaMock.qRCode.findUnique.mockResolvedValue(existingQrCode);

      (generateQrToken as jest.Mock).mockReturnValue(newToken);

      txMock.qRCode.update.mockResolvedValue(updatedQrCode);

      const result = await service.regenerateForAsset(assetId, ownerId);

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

      expect(txMock.qRCode.update).toHaveBeenCalledWith({
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

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        {
          actorId: ownerId,
          assetId,
          event: Event.QR_REGENERATED,
          payload: {
            qrCodeId,
            previousToken: token,
            newToken,
          },
        },
        txMock,
      );

      expect(result).toEqual({
        id: updatedQrCode.id,
        token: newToken,
        url: `https://airtracer.local/qr/${newToken}`,
        asset,
      });
    });

    it('should throw NotFoundException when the asset does not exist', async () => {
      prismaMock.asset.findUnique.mockResolvedValue(null);

      await expect(
        service.regenerateForAsset(assetId, ownerId),
      ).rejects.toThrow(new NotFoundException('Asset not found'));

      expect(prismaMock.qRCode.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(auditServiceMock.log).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the asset belongs to another user', async () => {
      prismaMock.asset.findUnique.mockResolvedValue({
        ...asset,
        ownerId: otherUserId,
        qrCode,
      });

      await expect(
        service.regenerateForAsset(assetId, ownerId),
      ).rejects.toThrow(new ForbiddenException('You do not own this asset.'));

      expect(prismaMock.qRCode.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the asset has no QR code', async () => {
      prismaMock.asset.findUnique.mockResolvedValue({
        ...asset,
        qrCode: null,
      });

      prismaMock.qRCode.findUnique.mockResolvedValue(null);

      await expect(
        service.regenerateForAsset(assetId, ownerId),
      ).rejects.toThrow(
        new NotFoundException('QR code not found for this asset'),
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(txMock.qRCode.update).not.toHaveBeenCalled();
      expect(auditServiceMock.log).not.toHaveBeenCalled();
    });
  });
});
