import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { generateQrToken } from './utils/qr.util';

@Injectable()
export class QrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}
  //-------------------------------------------------------------//
  private buildQrUrl(token: string): string {
    const baseUrl = this.configService.getOrThrow<string>('QR_BASE_URL');

    return `${baseUrl}/qr/${token}`;
  }
  //-------------------------------------------------------------//
  // Create a QR code for an asset.
  async createForAsset(assetId: string) {
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

    if (asset.qrCode) {
      throw new ConflictException('This asset already has a QR code');
    }

    const token = generateQrToken();

    const qrCode = await this.prisma.qRCode.create({
      data: {
        token,
        assetId,
      },
      include: {
        asset: true,
      },
    });

    const url = this.buildQrUrl(qrCode.token);

    return {
      id: qrCode.id,
      token: qrCode.token,
      url,
      asset: qrCode.asset,
    };
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
  // Find the QR record and validate that it is active.
  async validate(token: string) {
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

    if (!qrCode.isActive) {
      throw new ConflictException('QR code is inactive');
    }

    return qrCode;
  }
  //-------------------------------------------------------------//
  // Deactivate a QR code.
  async deactivate(token: string) {
    const qrCode = await this.prisma.qRCode.findUnique({
      where: {
        token,
      },
    });

    if (!qrCode) {
      throw new NotFoundException('QR code not found');
    }

    return this.prisma.qRCode.update({
      where: {
        token,
      },
      data: {
        isActive: false,
      },
    });
  }
  //-------------------------------------------------------------//
  // Activate an existing QR code.
  async activate(token: string) {
    const qrCode = await this.prisma.qRCode.findUnique({
      where: {
        token,
      },
    });

    if (!qrCode) {
      throw new NotFoundException('QR code not found');
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
  async regenerateForAsset(assetId: string) {
    const qrCode = await this.prisma.qRCode.findUnique({
      where: {
        assetId,
      },
    });

    if (!qrCode) {
      throw new NotFoundException('QR code not found for this asset');
    }

    const token = generateQrToken();

    const updatedQrCode = await this.prisma.qRCode.update({
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

    const url = this.buildQrUrl(updatedQrCode.token);

    return {
      id: updatedQrCode.id,
      token: updatedQrCode.token,
      url,
      asset: updatedQrCode.asset,
    };
  }
  //-------------------------------------------------------------//
  // Get the QR record belonging to an asset.
  async findByAssetId(assetId: string) {
    const qrCode = await this.prisma.qRCode.findUnique({
      where: {
        assetId,
      },
      include: {
        asset: true,
      },
    });

    if (!qrCode) {
      throw new NotFoundException('QR code not found for this asset');
    }

    return qrCode;
  }
}
