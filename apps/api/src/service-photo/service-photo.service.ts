import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import {
  ALLOWED_PHOTO_MIME_TYPES,
  detectImageMimeType,
  MAX_PHOTO_SIZE_BYTES,
} from './utils/image-file.util';
import { CreateServicePhotoDto } from './dto/create-service-photo.dto';
import { UpdateServicePhotoDto } from './dto/update-service-photo.dto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { Event } from '../../generated/prisma/enums';

@Injectable()
export class ServicePhotoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly storageService: StorageService,
  ) {}
  //-------------------------------------------------------------//
  private async getServiceRecord(serviceRecordId: string) {
    const serviceRecord = await this.prisma.serviceRecord.findUnique({
      where: { id: serviceRecordId },
      include: {
        asset: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!serviceRecord) {
      throw new NotFoundException('Service record not found');
    }

    return serviceRecord;
  }
  //-------------------------------------------------------------//
  // The asset owner and the record's technician may add photos.
  private assertCanAddPhotos(
    serviceRecord: { technicianId: string; asset: { ownerId: string } },
    userId: string,
  ) {
    if (
      serviceRecord.technicianId !== userId &&
      serviceRecord.asset.ownerId !== userId
    ) {
      throw new ForbiddenException(
        'Only the equipment owner or the technician who created this service record can add photos.',
      );
    }
  }
  //-------------------------------------------------------------//
  // Photos are evidence: only the technician who created the service record
  // may edit or remove them.
  private assertRecordTechnician(
    serviceRecord: { technicianId: string },
    userId: string,
  ) {
    if (serviceRecord.technicianId !== userId) {
      throw new ForbiddenException(
        'Only the technician who created this service record can change its photos.',
      );
    }
  }
  //-------------------------------------------------------------//
  private validateImage(file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('A photo file is required.');
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      throw new PayloadTooLargeException('Photos must be 10 MB or smaller.');
    }

    const detectedType = detectImageMimeType(file.buffer);
    if (!detectedType || detectedType !== file.mimetype) {
      throw new BadRequestException(
        `Photos must be one of: ${ALLOWED_PHOTO_MIME_TYPES.join(', ')}.`,
      );
    }

    return file;
  }
  //-------------------------------------------------------------//
  async upload(
    serviceRecordId: string,
    userId: string,
    uploadedFile: Express.Multer.File | undefined,
    dto: CreateServicePhotoDto,
  ) {
    const serviceRecord = await this.getServiceRecord(serviceRecordId);
    this.assertCanAddPhotos(serviceRecord, userId);
    const file = this.validateImage(uploadedFile);

    // Store the file
    const directory = `service-records/${serviceRecordId}`;
    const storageKey = await this.storageService.save(file, directory);

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Store the file metadata
        const photo = await tx.servicePhoto.create({
          data: {
            serviceRecordId,
            fileName: file.originalname,
            storageKey,
            mimeType: file.mimetype,
            fileSize: file.size,
            caption: dto.caption,
          },
        });

        await this.auditService.log(
          {
            actorId: userId,
            assetId: serviceRecord.assetId,
            event: Event.SERVICE_PHOTO_ADDED,
            payload: {
              serviceRecordId,
              servicePhotoId: photo.id,
              fileName: photo.fileName,
              storageKey: photo.storageKey,
              mimeType: photo.mimeType,
              fileSize: photo.fileSize,
              caption: photo.caption,
            },
          },
          tx,
        );

        // Generate temporary URL
        const url = await this.storageService.getUrl(photo.storageKey);

        return {
          id: photo.id,
          serviceRecordId: photo.serviceRecordId,
          fileName: photo.fileName,
          mimeType: photo.mimeType,
          fileSize: photo.fileSize,
          caption: photo.caption,
          uploadedAt: photo.uploadedAt,
          url,
        };
      });
    } catch (error) {
      // Remove the uploaded file if DB transaction fails
      await this.storageService.delete(storageKey);
      throw error;
    }
  }
  //-------------------------------------------------------------//
  // Any owner or technician may view photos; the role check is in the controller.
  async findByServiceRecord(serviceRecordId: string) {
    await this.getServiceRecord(serviceRecordId);

    const photos = await this.prisma.servicePhoto.findMany({
      where: { serviceRecordId },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    // Generate URLs for all photos
    return Promise.all(
      photos.map(async (photo) => ({
        id: photo.id,
        serviceRecordId: photo.serviceRecordId,
        fileName: photo.fileName,
        mimeType: photo.mimeType,
        fileSize: photo.fileSize,
        caption: photo.caption,
        uploadedAt: photo.uploadedAt,
        url: await this.storageService.getUrl(photo.storageKey),
      })),
    );
  }
  //-------------------------------------------------------------//
  async update(id: string, userId: string, dto: UpdateServicePhotoDto) {
    const photo = await this.prisma.servicePhoto.findUnique({
      where: { id },
      include: {
        serviceRecord: {
          select: {
            technicianId: true,
          },
        },
      },
    });

    if (!photo) {
      throw new NotFoundException('Service photo not found');
    }

    this.assertRecordTechnician(photo.serviceRecord, userId);

    return this.prisma.servicePhoto.update({
      where: { id },
      data: dto,
    });
  }
  //-------------------------------------------------------------//
  async remove(id: string, userId: string) {
    const photo = await this.prisma.servicePhoto.findUnique({
      where: {
        id,
      },
      include: {
        serviceRecord: {
          select: {
            assetId: true,
            technicianId: true,
          },
        },
      },
    });

    if (!photo) {
      throw new NotFoundException('Service photo not found');
    }

    this.assertRecordTechnician(photo.serviceRecord, userId);

    // Delete DB record and create audit log atomically.
    const deletedPhoto = await this.prisma.$transaction(async (tx) => {
      await tx.servicePhoto.delete({
        where: {
          id,
        },
      });

      await this.auditService.log(
        {
          actorId: userId,
          assetId: photo.serviceRecord.assetId,
          event: Event.SERVICE_PHOTO_REMOVED,
          payload: {
            serviceRecordId: photo.serviceRecordId,
            servicePhotoId: photo.id,
            fileName: photo.fileName,
            storageKey: photo.storageKey,
            mimeType: photo.mimeType,
            fileSize: photo.fileSize,
            caption: photo.caption,
          },
        },
        tx,
      );

      return photo;
    });

    // Database deletion succeeded.
    // Now delete the physical file.
    try {
      await this.storageService.delete(deletedPhoto.storageKey);
    } catch (error) {
      // The database is already consistent, but the physical file
      // may now be orphaned in storage.
      console.error(
        `Failed to delete service photo from storage: ${deletedPhoto.storageKey}`,
        error,
      );
    }

    return deletedPhoto;
  }
}
