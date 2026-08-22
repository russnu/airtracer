import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { generateQrToken } from './utils/qr.util';
import { PublicPassportResponseDto } from './dto/public-passport-response.dto';
import { Event } from '../../generated/prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class QrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}
  //-------------------------------------------------------------//
  private buildQrUrl(token: string): string {
    const baseUrl = this.configService.getOrThrow<string>('QR_BASE_URL');

    return `${baseUrl}/qr/${token}`;
  }
  //-------------------------------------------------------------//
  private async verifyAssetOwnership(assetId: string, userId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: {
        id: assetId,
      },
      include: {
        qrCode: true,
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    if (asset.ownerId !== userId) {
      throw new ForbiddenException('You do not own this asset.');
    }

    return asset;
  }
  //-------------------------------------------------------------//
  private async verifyQrOwnership(token: string, userId: string) {
    const qrCode = await this.prisma.qRCode.findUnique({
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

    if (!qrCode) {
      throw new NotFoundException('QR code not found');
    }

    if (qrCode.asset.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not own the asset associated with this QR code',
      );
    }

    return qrCode;
  }
  //-------------------------------------------------------------//
  // Create a QR code for an asset.
  async createForAsset(assetId: string, userId: string) {
    const asset = await this.verifyAssetOwnership(assetId, userId);

    if (asset.qrCode) {
      throw new ConflictException('This asset already has a QR code');
    }

    const token = generateQrToken();

    return this.prisma.$transaction(async (tx) => {
      const qrCode = await tx.qRCode.create({
        data: {
          token,
          assetId,
        },
        include: {
          asset: true,
        },
      });

      await this.auditService.log(
        {
          actorId: userId,
          assetId,
          event: Event.QR_GENERATED,
          payload: {
            qrCodeId: qrCode.id,
            token: qrCode.token,
            generatedAt: qrCode.generatedAt.toISOString(),
          },
        },
        tx,
      );

      return {
        id: qrCode.id,
        token: qrCode.token,
        url: this.buildQrUrl(qrCode.token),
        asset: qrCode.asset,
      };
    });
  }
  //-------------------------------------------------------------//
  // Find an asset using the token encoded in the QR code.
  async findAssetByToken(token: string) {
    const qrCode = await this.prisma.qRCode.findUnique({
      where: {
        token,
      },
      include: {
        asset: true,
      },
    });

    if (!qrCode) {
      throw new NotFoundException('QR code not found');
    }

    return qrCode.asset;
  }
  //-------------------------------------------------------------//
  // Retrieve service history for public display
  async getPublicPassport(token: string): Promise<PublicPassportResponseDto> {
    const qrCode = await this.prisma.qRCode.findUnique({
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

    if (!qrCode) {
      throw new NotFoundException('QR code not found');
    }

    if (!qrCode.isActive) {
      throw new ConflictException('QR code is inactive');
    }

    return {
      asset: {
        id: qrCode.asset.id,
        brand: qrCode.asset.brand,
        model: qrCode.asset.model,
        serialNumber: qrCode.asset.serialNumber,
        equipmentType: qrCode.asset.equipmentType.name,
        installationDate: qrCode.asset.installationDate,
        location: qrCode.asset.location,
      },

      serviceHistory: qrCode.asset.serviceRecords.map((record) => ({
        id: record.id,
        serviceDate: record.serviceDate,
        serviceType: record.serviceType,
        description: record.description,
        measurements: {
          suctionPressure: record.suctionPressure,
          dischargePressure: record.dischargePressure,
          current: record.current,
          voltage: record.voltage,
        },

        findings: record.findings,
        recommendations: record.recommendations,

        technician: record.technician
          ? {
              name: `${record.technician.firstName} ${record.technician.lastName}`,
            }
          : null,
      })),
    };
  }
  //-------------------------------------------------------------//
  // Deactivate a QR code.
  async deactivate(token: string, userId: string) {
    const qrCode = await this.verifyQrOwnership(token, userId);

    if (!qrCode.isActive) {
      throw new ConflictException('QR code is already inactive');
    }
    return this.prisma.$transaction(async (tx) => {
      const updatedQr = this.prisma.qRCode.update({
        where: {
          token,
        },
        data: {
          isActive: false,
        },
      });

      await this.auditService.log(
        {
          actorId: userId,
          assetId: qrCode.assetId,
          event: Event.QR_DEACTIVATED,
          payload: {
            qrCodeId: qrCode.id,
            previousStatus: true,
            newStatus: false,
          },
        },
        tx,
      );

      return updatedQr;
    });
  }
  //-------------------------------------------------------------//
  // Activate an existing QR code.
  async activate(token: string, userId: string) {
    const qrCode = await this.verifyQrOwnership(token, userId);

    if (qrCode.isActive) {
      throw new ConflictException('QR code is already active');
    }

    return this.prisma.qRCode.update({
      where: {
        token,
      },
      data: {
        isActive: true,
      },
    });
  }
  //-------------------------------------------------------------//
  // Regenerate an asset's QR code. The old token becomes invalid.
  async regenerateForAsset(assetId: string, userId: string) {
    await this.verifyAssetOwnership(assetId, userId);

    const qrCode = await this.prisma.qRCode.findUnique({
      where: {
        assetId,
      },
    });

    if (!qrCode) {
      throw new NotFoundException('QR code not found for this asset');
    }

    const previousToken = qrCode.token;
    const token = generateQrToken();

    return this.prisma.$transaction(async (tx) => {
      const updatedQrCode = await tx.qRCode.update({
        where: {
          assetId,
        },
        data: {
          token,
          isActive: true,
          generatedAt: new Date(),
        },
        include: {
          asset: true,
        },
      });

      await this.auditService.log(
        {
          actorId: userId,
          assetId,
          event: Event.QR_REGENERATED,
          payload: {
            qrCodeId: qrCode.id,
            previousToken,
            newToken: token,
          },
        },
        tx,
      );

      return {
        id: updatedQrCode.id,
        token: updatedQrCode.token,
        url: this.buildQrUrl(updatedQrCode.token),
        asset: updatedQrCode.asset,
      };
    });
  }
}
