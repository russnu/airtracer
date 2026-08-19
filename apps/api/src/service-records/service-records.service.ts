import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceRecordDto } from './dto/create-service-record.dto';

@Injectable()
export class ServiceRecordsService {
  constructor(private readonly prisma: PrismaService) {}
  //-------------------------------------------------------------//
  private async verifyAssetExists(assetId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: {
        id: assetId,
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found.');
    }
    return asset;
  }
  //-------------------------------------------------------------//
  async create(
    assetId: string,
    technicianId: string,
    dto: CreateServiceRecordDto,
  ) {
    // Verify asset if existing
    await this.verifyAssetExists(assetId);

    // Create service record for asset
    return this.prisma.serviceRecord.create({
      data: {
        assetId,
        technicianId,
        serviceDate: new Date(dto.serviceDate),
        serviceType: dto.serviceType,
        description: dto.description,
        suctionPressure: dto.suctionPressure,
        dischargePressure: dto.dischargePressure,
        current: dto.current,
        voltage: dto.voltage,
        findings: dto.findings,
        recommendations: dto.recommendations,
      },
    });
  }
  //-------------------------------------------------------------//
  async findOne(id: string) {
    const serviceRecord = await this.prisma.serviceRecord.findUnique({
      where: { id },
    });

    if (!serviceRecord) {
      throw new NotFoundException('Service record not found');
    }

    return serviceRecord;
  }
  //-------------------------------------------------------------//
  async findByAsset(assetId: string) {
    await this.verifyAssetExists(assetId);

    return this.prisma.serviceRecord.findMany({
      where: { assetId },
      orderBy: {
        serviceDate: 'desc',
      },
    });
  }
  //-------------------------------------------------------------//
}
