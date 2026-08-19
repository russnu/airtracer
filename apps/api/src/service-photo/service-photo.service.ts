import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateServicePhotoDto } from './dto/create-service-photo.dto';
import { UpdateServicePhotoDto } from './dto/update-service-photo.dto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ServicePhotoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}
  //-------------------------------------------------------------//
  async upload(
    serviceRecordId: string,
    file: Express.Multer.File,
    dto: CreateServicePhotoDto,
  ) {
    // Check that the service record exists
    const serviceRecord = await this.prisma.serviceRecord.findUnique({
      where: { id: serviceRecordId },
    });

    if (!serviceRecord) {
      throw new NotFoundException('Service record not found');
    }

    // Store the file
    const directory = `service-records/${serviceRecordId}`;

    const storageKey = await this.storageService.save(file, directory);

    try {
      // Store the file metadata
      const photo = await this.prisma.servicePhoto.create({
        data: {
          serviceRecordId,
          fileName: file.originalname,
          storageKey,
          mimeType: file.mimetype,
          fileSize: file.size,
          caption: dto.caption,
        },
      });

      // Generate a temporary URL for the frontend
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
    } catch (error) {
      // Remove the uploaded file if DB creation fails
      await this.storageService.delete(storageKey);

      throw error;
    }
  }
  //-------------------------------------------------------------//
  async findByServiceRecord(serviceRecordId: string) {
    // Check that the service record exists
    const serviceRecord = await this.prisma.serviceRecord.findUnique({
      where: { id: serviceRecordId },
    });

    if (!serviceRecord) {
      throw new NotFoundException('Service record not found');
    }

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
  async update(id: string, dto: UpdateServicePhotoDto) {
    const photo = await this.prisma.servicePhoto.findUnique({
      where: { id },
    });

    if (!photo) {
      throw new NotFoundException('Service photo not found');
    }

    return this.prisma.servicePhoto.update({
      where: { id },
      data: dto,
    });
  }
  //-------------------------------------------------------------//
  async remove(id: string) {
    const photo = await this.prisma.servicePhoto.findUnique({
      where: { id },
    });

    if (!photo) {
      throw new NotFoundException('Service photo not found');
    }

    // Delete the physical file first
    await this.storageService.delete(photo.storageKey);

    // Then delete the database record
    return this.prisma.servicePhoto.delete({
      where: { id },
    });
  }
}
