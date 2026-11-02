import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceRecordDto } from './dto/create-service-record.dto';
import { AuditService } from '../audit/audit.service';
import { Event } from '../../generated/prisma/enums';
import { VoidServiceRecordDto } from './dto/void-service-record.dto';

const assetSummarySelect = {
  id: true,
  brand: true,
  model: true,
  serialNumber: true,
  location: true,
  ownerId: true,
} satisfies Prisma.AssetSelect;

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
  // Returns the record already stored for this idempotency key, if any. The key
  // may only be replayed by the same technician for the same asset.
  private async findExistingRequest(
    clientRequestId: string,
    assetId: string,
    technicianId: string,
  ) {
    const existing = await this.prisma.serviceRecord.findUnique({
      where: { clientRequestId },
    });

    if (!existing) {
      return null;
    }

    if (
      existing.technicianId !== technicianId ||
      existing.assetId !== assetId
    ) {
      throw new ConflictException(
        'This clientRequestId has already been used for a different request.',
      );
    }

    return existing;
  }
  //-------------------------------------------------------------//
  async create(
    assetId: string,
    technicianId: string,
    dto: CreateServiceRecordDto,
  ) {
    const { clientRequestId } = dto;

    // A replay returns the stored record even if the asset has since been
    // deactivated: the record was accepted when it was first received.
    if (clientRequestId) {
      const existing = await this.findExistingRequest(
        clientRequestId,
        assetId,
        technicianId,
      );
      if (existing) {
        return existing;
      }
    }

    // Verify asset if existing
    const asset = await this.verifyAssetExists(assetId);

    if (!asset.isActive) {
      throw new BadRequestException(
        'Cannot create a service record for an inactive asset.',
      );
    }

    try {
      return await this.createRecord(assetId, technicianId, dto);
    } catch (error) {
      // Two requests with the same key raced; the other one was stored first.
      if (
        clientRequestId &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.findExistingRequest(
          clientRequestId,
          assetId,
          technicianId,
        );
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }
  //-------------------------------------------------------------//
  private createRecord(
    assetId: string,
    technicianId: string,
    dto: CreateServiceRecordDto,
  ) {
    // Create service record for asset
    return this.prisma.$transaction(async (tx) => {
      const serviceRecord = await tx.serviceRecord.create({
        data: {
          clientRequestId: dto.clientRequestId,
          assetId,
          technicianId,
          serviceDate: new Date(dto.serviceDate),
          serviceType: dto.serviceType,
          description: dto.description,
          outcome: dto.outcome,
          suctionPressure: dto.suctionPressure,
          dischargePressure: dto.dischargePressure,
          current: dto.current,
          voltage: dto.voltage,
          returnAirTemp: dto.returnAirTemp,
          supplyAirTemp: dto.supplyAirTemp,
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
            outcome: serviceRecord.outcome,
            suctionPressure: serviceRecord.suctionPressure,
            dischargePressure: serviceRecord.dischargePressure,
            current: serviceRecord.current,
            voltage: serviceRecord.voltage,
            returnAirTemp: serviceRecord.returnAirTemp,
            supplyAirTemp: serviceRecord.supplyAirTemp,
            findings: serviceRecord.findings,
            recommendations: serviceRecord.recommendations,
            clientRequestId: serviceRecord.clientRequestId,
            // Reported by the device; informational only.
            clientCapturedAt: dto.clientCapturedAt ?? null,
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
      include: {
        asset: { select: assetSummarySelect },
      },
    });

    if (!serviceRecord) {
      throw new NotFoundException('Service record not found');
    }

    return serviceRecord;
  }
  //-------------------------------------------------------------//
  // Records created by the given technician, newest first.
  async findByTechnician(technicianId: string) {
    const serviceRecords = await this.prisma.serviceRecord.findMany({
      where: { technicianId },
      orderBy: {
        serviceDate: 'desc',
      },
      include: {
        asset: { select: assetSummarySelect },
        _count: { select: { photos: true } },
      },
    });

    return serviceRecords.map(({ _count, ...serviceRecord }) => ({
      ...serviceRecord,
      photoCount: _count.photos,
    }));
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
  // Records are append-only, so voiding is the only change: the record stays
  // in the history, labelled as voided, and cannot be restored.
  async voidRecord(
    id: string,
    technicianId: string,
    dto: VoidServiceRecordDto,
  ) {
    const serviceRecord = await this.prisma.serviceRecord.findUnique({
      where: {
        id,
      },
    });

    if (!serviceRecord) {
      throw new NotFoundException('Service record not found');
    }

    if (serviceRecord.technicianId !== technicianId) {
      throw new ForbiddenException(
        'Only the technician who created this service record can void it.',
      );
    }

    if (serviceRecord.voidedAt) {
      throw new ConflictException('This service record is already voided.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Matches only while the record is still unvoided, so of two
        // concurrent requests only one succeeds.
        const voidedRecord = await tx.serviceRecord.update({
          where: {
            id,
            voidedAt: null,
          },
          data: {
            voidedAt: new Date(),
            voidReason: dto.reason,
          },
        });

        await this.auditService.log(
          {
            actorId: technicianId,
            assetId: serviceRecord.assetId,
            event: Event.SERVICE_RECORD_VOIDED,
            payload: {
              serviceRecordId: serviceRecord.id,
              reason: dto.reason,
            },
          },
          tx,
        );

        return voidedRecord;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new ConflictException('This service record is already voided.');
      }
      throw error;
    }
  }
}
