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

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}
  //-------------------------------------------------------------//
  async create(ownerId: string, dto: CreateAssetDto) {
    // Verify equipment type
    const equipmentType = await this.prisma.equipmentType.findFirst({
      where: {
        id: dto.equipmentTypeId,
        isActive: true,
      },
    });

    if (!equipmentType) {
      throw new NotFoundException('Equipment type not found or is inactive');
    }

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
          equipmentTypeId: dto.equipmentTypeId,
          installationDate: dto.installationDate
            ? new Date(dto.installationDate)
            : undefined,
          location: dto.location,
          ownerId,
        },
        include: {
          equipmentType: true,
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
            equipmentTypeId: asset.equipmentTypeId,
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
    return this.prisma.asset.findMany({
      where: {
        ownerId,
      },
      include: {
        equipmentType: true,
        qrCode: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  //-------------------------------------------------------------//
  async findOne(id: string, ownerId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: {
        id,
        ownerId,
      },
      include: {
        equipmentType: true,
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

    return asset;
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

    // If equipment type is being changed,
    // make sure the new type exists and is active.
    if (dto.equipmentTypeId) {
      const equipmentType = await this.prisma.equipmentType.findFirst({
        where: {
          id: dto.equipmentTypeId,
          isActive: true,
        },
      });

      if (!equipmentType) {
        throw new NotFoundException('Equipment type not found or is inactive');
      }
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
          equipmentTypeId: dto.equipmentTypeId,
          installationDate: dto.installationDate
            ? new Date(dto.installationDate)
            : undefined,
          location: dto.location,
        },
        include: {
          equipmentType: true,
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

      if (asset.equipmentTypeId !== updatedAsset.equipmentTypeId) {
        changes.equipmentTypeId = {
          from: asset.equipmentTypeId,
          to: updatedAsset.equipmentTypeId,
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
