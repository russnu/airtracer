import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { AuditService } from '../audit/audit.service';
import { Event } from '../../generated/prisma/enums';
import { ConfigService } from '@nestjs/config';
import { buildPassportUrl } from '../qr/utils/qr.util';

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}
  //-------------------------------------------------------------//
  // Adds the passport URL to the asset's QR code so clients never build it.
  private withQrUrl<T extends { qrCode: { token: string } | null }>(asset: T) {
    if (!asset.qrCode) {
      return asset;
    }

    const baseUrl = this.configService.getOrThrow<string>('QR_BASE_URL');

    return {
      ...asset,
      qrCode: {
        ...asset.qrCode,
        url: buildPassportUrl(baseUrl, asset.qrCode.token),
      },
    };
  }
  //-------------------------------------------------------------//
  async create(ownerId: string, dto: CreateAssetDto) {
    // Check serial number only if provided
    if (dto.serialNumber) {
      const existingAsset = await this.prisma.asset.findUnique({
        where: {
          serialNumber: dto.serialNumber,
        },
      });

      if (existingAsset) {
        throw new ConflictException(
          'An asset with this serial number already exists',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.create({
        data: {
          brand: dto.brand,
          model: dto.model,
          serialNumber: dto.serialNumber,
          equipmentType: dto.equipmentType,
          refrigerant: dto.refrigerant,
          capacity: dto.capacity,
          capacityUnit: dto.capacityUnit,
          installationDate: dto.installationDate
            ? new Date(dto.installationDate)
            : undefined,
          location: dto.location,
          ownerId,
        },
      });

      await this.auditService.log(
        {
          actorId: ownerId,
          assetId: asset.id,
          event: Event.ASSET_CREATED,
          payload: {
            brand: asset.brand,
            model: asset.model,
            serialNumber: asset.serialNumber,
            equipmentType: asset.equipmentType,
            refrigerant: asset.refrigerant,
            capacity: asset.capacity,
            capacityUnit: asset.capacityUnit,
            installationDate: asset.installationDate?.toISOString() ?? null,
            location: asset.location,
            ownerId: asset.ownerId,
          },
        },
        tx,
      );

      return asset;
    });
  }
  //-------------------------------------------------------------//
  async findAll(ownerId: string) {
    const assets = await this.prisma.asset.findMany({
      where: {
        ownerId,
      },
      include: {
        qrCode: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return assets.map((asset) => this.withQrUrl(asset));
  }
  //-------------------------------------------------------------//
  async findOne(id: string, ownerId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        id,
        ownerId,
      },
      include: {
        qrCode: true,
        serviceRecords: {
          orderBy: {
            serviceDate: 'desc',
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return this.withQrUrl(asset);
  }
  //-------------------------------------------------------------//
  async update(id: string, ownerId: string, dto: UpdateAssetDto) {
    // Verify ownership
    const asset = await this.prisma.asset.findFirst({
      where: {
        id,
        ownerId,
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    // Check serial number uniqueness if changed
    if (dto.serialNumber && dto.serialNumber !== asset.serialNumber) {
      const existingAsset = await this.prisma.asset.findUnique({
        where: {
          serialNumber: dto.serialNumber,
        },
      });

      if (existingAsset) {
        throw new ConflictException(
          'An asset with this serial number already exists',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedAsset = await tx.asset.update({
        where: {
          id,
        },
        data: {
          brand: dto.brand,
          model: dto.model,
          serialNumber: dto.serialNumber,
          equipmentType: dto.equipmentType,
          refrigerant: dto.refrigerant,
          capacity: dto.capacity,
          capacityUnit: dto.capacityUnit,
          installationDate: dto.installationDate
            ? new Date(dto.installationDate)
            : undefined,
          location: dto.location,
        },
      });

      const changes: Record<
        string,
        {
          from: string | number | boolean | null;
          to: string | number | boolean | null;
        }
      > = {};

      if (asset.brand !== updatedAsset.brand) {
        changes.brand = {
          from: asset.brand,
          to: updatedAsset.brand,
        };
      }

      if (asset.model !== updatedAsset.model) {
        changes.model = {
          from: asset.model,
          to: updatedAsset.model,
        };
      }

      if (asset.serialNumber !== updatedAsset.serialNumber) {
        changes.serialNumber = {
          from: asset.serialNumber,
          to: updatedAsset.serialNumber,
        };
      }

      if (asset.equipmentType !== updatedAsset.equipmentType) {
        changes.equipmentType = {
          from: asset.equipmentType,
          to: updatedAsset.equipmentType,
        };
      }

      // Refrigerant
      if (asset.refrigerant !== updatedAsset.refrigerant) {
        changes.refrigerant = {
          from: asset.refrigerant,
          to: updatedAsset.refrigerant,
        };
      }

      // Capacity
      if (asset.capacity !== updatedAsset.capacity) {
        changes.capacity = {
          from: asset.capacity,
          to: updatedAsset.capacity,
        };
      }

      // Capacity unit
      if (asset.capacityUnit !== updatedAsset.capacityUnit) {
        changes.capacityUnit = {
          from: asset.capacityUnit,
          to: updatedAsset.capacityUnit,
        };
      }

      if (
        asset.installationDate?.getTime() !==
        updatedAsset.installationDate?.getTime()
      ) {
        changes.installationDate = {
          from: asset.installationDate?.toISOString() ?? null,
          to: updatedAsset.installationDate?.toISOString() ?? null,
        };
      }

      if (asset.location !== updatedAsset.location) {
        changes.location = {
          from: asset.location,
          to: updatedAsset.location,
        };
      }

      if (Object.keys(changes).length > 0) {
        await this.auditService.log(
          {
            actorId: ownerId,
            assetId: updatedAsset.id,
            event: Event.ASSET_UPDATED,
            payload: {
              changes,
            },
          },
          tx,
        );
      }

      return updatedAsset;
    });
  }
  //-------------------------------------------------------------//
  async deactivate(id: string, ownerId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        id,
        ownerId,
        isActive: true,
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found or already inactive');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedAsset = await tx.asset.update({
        where: {
          id: asset.id,
        },
        data: {
          isActive: false,
        },
      });

      await this.auditService.log(
        {
          actorId: ownerId,
          assetId: asset.id,
          event: Event.ASSET_DEACTIVATED,
          payload: {
            previousStatus: true,
            newStatus: false,
          },
        },
        tx,
      );

      return updatedAsset;
    });
  }
  //-------------------------------------------------------------//
  async remove(id: string, ownerId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        id,
        ownerId,
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return this.prisma.asset.delete({
      where: {
        id: asset.id,
      },
    });
  }
  //-------------------------------------------------------------//
}
