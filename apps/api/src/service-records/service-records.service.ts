import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceRecordDto } from './dto/create-service-record.dto';
import { AuditService } from '../audit/audit.service';
import { Event, ServiceStatus } from '../../generated/prisma/enums';
import { UpdateServiceRecordStatusDto } from './dto/update-service-record-status.dto';

@Injectable()
export class ServiceRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}
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
    const asset = await this.verifyAssetExists(assetId);

    if (!asset.isActive) {
      throw new BadRequestException(
        'Cannot create a service record for an inactive asset.',
      );
    }

    // Create service record for asset
    return this.prisma.$transaction(async (tx) => {
      const serviceRecord = await tx.serviceRecord.create({
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

      await this.auditService.log(
        {
          actorId: technicianId,
          assetId,
          event: Event.SERVICE_RECORD_CREATED,
          payload: {
            serviceRecordId: serviceRecord.id,
            serviceDate: serviceRecord.serviceDate.toISOString(),
            serviceType: serviceRecord.serviceType,
            description: serviceRecord.description,
            status: serviceRecord.status,
            suctionPressure: serviceRecord.suctionPressure,
            dischargePressure: serviceRecord.dischargePressure,
            current: serviceRecord.current,
            voltage: serviceRecord.voltage,
            findings: serviceRecord.findings,
            recommendations: serviceRecord.recommendations,
          },
        },
        tx,
      );

      return serviceRecord;
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
  async updateStatus(
    id: string,
    technicianId: string,
    dto: UpdateServiceRecordStatusDto,
  ) {
    const serviceRecord = await this.prisma.serviceRecord.findUnique({
      where: {
        id,
      },
    });

    if (!serviceRecord) {
      throw new NotFoundException('Service record not found');
    }

    // Don't create an audit event if the status is unchanged.
    if (serviceRecord.status === dto.status) {
      return serviceRecord;
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedRecord = await tx.serviceRecord.update({
        where: {
          id,
        },
        data: {
          status: dto.status,
        },
      });

      let event: Event;

      switch (dto.status) {
        case ServiceStatus.COMPLETED:
          event = Event.SERVICE_RECORD_COMPLETED;
          break;

        case ServiceStatus.CANCELLED:
          event = Event.SERVICE_RECORD_CANCELLED;
          break;

        default:
          event = Event.SERVICE_RECORD_UPDATED;
      }

      await this.auditService.log(
        {
          actorId: technicianId,
          assetId: serviceRecord.assetId,
          event,
          payload: {
            serviceRecordId: serviceRecord.id,
            changes: {
              status: {
                from: serviceRecord.status,
                to: updatedRecord.status,
              },
            },
          },
        },
        tx,
      );

      return updatedRecord;
    });
  }
}
