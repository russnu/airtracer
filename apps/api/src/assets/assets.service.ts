import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}
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

    return this.prisma.asset.create({
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

    return this.prisma.asset.update({
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
        id,
      },
    });
  }
  //-------------------------------------------------------------//
}
