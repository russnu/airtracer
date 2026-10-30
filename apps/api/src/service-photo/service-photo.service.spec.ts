import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';

import { ServicePhotoService } from './service-photo.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { Event } from '../../generated/prisma/enums';

describe('ServicePhotoService', () => {
  let service: ServicePhotoService;

  const prismaMock = {
    serviceRecord: {
      findUnique: jest.fn(),
    },
    servicePhoto: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const auditServiceMock = {
    log: jest.fn(),
  };

  const storageServiceMock = {
    save: jest.fn(),
    getUrl: jest.fn(),
    delete: jest.fn(),
  };

  const serviceRecordId = 'service-record-1';
  const photoId = 'photo-1';
  const userId = 'technician-1';
  const assetId = 'asset-1';

  const ownerId = 'owner-1';

  const serviceRecord = {
    id: serviceRecordId,
    assetId,
    technicianId: userId,
    asset: { ownerId },
  };

  const serviceRecordQuery = {
    where: {
      id: serviceRecordId,
    },
    include: {
      asset: {
        select: {
          ownerId: true,
        },
      },
    },
  };

  // Starts with the JPEG signature so content sniffing accepts it.
  const uploadedFile = {
    originalname: 'before.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
  } as Express.Multer.File;

  const createDto = {
    caption: 'Before maintenance',
  };

  const uploadedAt = new Date('2026-08-20T10:00:00.000Z');

  const photo = {
    id: photoId,
    serviceRecordId,
    fileName: 'before.jpg',
    storageKey: `service-records/${serviceRecordId}/before.jpg`,
    mimeType: 'image/jpeg',
    fileSize: 1024,
    caption: 'Before maintenance',
    uploadedAt,
  };

  const txMock = {
    servicePhoto: {
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback(txMock),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicePhotoService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: AuditService,
          useValue: auditServiceMock,
        },
        {
          provide: StorageService,
          useValue: storageServiceMock,
        },
      ],
    }).compile();

    service = module.get<ServicePhotoService>(ServicePhotoService);
  });

  // ---------------------------------------------------------------------------
  // upload
  // ---------------------------------------------------------------------------

  describe('upload', () => {
    it('should upload a photo, create metadata, audit the action, and return a URL', async () => {
      const storageKey = `service-records/${serviceRecordId}/before.jpg`;

      prismaMock.serviceRecord.findUnique.mockResolvedValue(serviceRecord);
      storageServiceMock.save.mockResolvedValue(storageKey);
      txMock.servicePhoto.create.mockResolvedValue(photo);
      auditServiceMock.log.mockResolvedValue(undefined);
      storageServiceMock.getUrl.mockResolvedValue(
        'https://storage.example.com/photo.jpg',
      );

      const result = await service.upload(
        serviceRecordId,
        userId,
        uploadedFile,
        createDto,
      );

      expect(prismaMock.serviceRecord.findUnique).toHaveBeenCalledWith(
        serviceRecordQuery,
      );

      expect(storageServiceMock.save).toHaveBeenCalledWith(
        uploadedFile,
        `service-records/${serviceRecordId}`,
      );

      expect(txMock.servicePhoto.create).toHaveBeenCalledWith({
        data: {
          serviceRecordId,
          fileName: uploadedFile.originalname,
          storageKey,
          mimeType: uploadedFile.mimetype,
          fileSize: uploadedFile.size,
          caption: createDto.caption,
        },
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        {
          actorId: userId,
          assetId,
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
        txMock,
      );

      expect(storageServiceMock.getUrl).toHaveBeenCalledWith(photo.storageKey);

      expect(result).toEqual({
        id: photo.id,
        serviceRecordId: photo.serviceRecordId,
        fileName: photo.fileName,
        mimeType: photo.mimeType,
        fileSize: photo.fileSize,
        caption: photo.caption,
        uploadedAt: photo.uploadedAt,
        url: 'https://storage.example.com/photo.jpg',
      });
    });

    it('should throw NotFoundException when the service record does not exist', async () => {
      prismaMock.serviceRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.upload(serviceRecordId, userId, uploadedFile, createDto),
      ).rejects.toThrow(new NotFoundException('Service record not found'));

      expect(storageServiceMock.save).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should reject an upload by a technician who did not create the record', async () => {
      prismaMock.serviceRecord.findUnique.mockResolvedValue({
        ...serviceRecord,
        technicianId: 'technician-2',
      });

      await expect(
        service.upload(serviceRecordId, userId, uploadedFile, createDto),
      ).rejects.toThrow(ForbiddenException);

      expect(storageServiceMock.save).not.toHaveBeenCalled();
    });

    it('should let the asset owner upload a photo', async () => {
      prismaMock.serviceRecord.findUnique.mockResolvedValue(serviceRecord);
      storageServiceMock.save.mockResolvedValue('service-records/key.jpg');
      txMock.servicePhoto.create.mockResolvedValue(photo);
      storageServiceMock.getUrl.mockResolvedValue('https://storage/photo.jpg');

      await expect(
        service.upload(serviceRecordId, ownerId, uploadedFile, createDto),
      ).resolves.toMatchObject({ id: photo.id });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: ownerId }),
        txMock,
      );
    });

    it('should reject an upload by an owner of a different asset', async () => {
      prismaMock.serviceRecord.findUnique.mockResolvedValue(serviceRecord);

      await expect(
        service.upload(serviceRecordId, 'owner-2', uploadedFile, createDto),
      ).rejects.toThrow(ForbiddenException);

      expect(storageServiceMock.save).not.toHaveBeenCalled();
    });

    it('should reject a request without a file', async () => {
      prismaMock.serviceRecord.findUnique.mockResolvedValue(serviceRecord);

      await expect(
        service.upload(serviceRecordId, userId, undefined, createDto),
      ).rejects.toThrow(BadRequestException);

      expect(storageServiceMock.save).not.toHaveBeenCalled();
    });

    it('should reject a file whose content is not an allowed image', async () => {
      prismaMock.serviceRecord.findUnique.mockResolvedValue(serviceRecord);

      await expect(
        service.upload(
          serviceRecordId,
          userId,
          { ...uploadedFile, buffer: Buffer.from('<svg></svg>') },
          createDto,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(storageServiceMock.save).not.toHaveBeenCalled();
    });

    it('should reject a file whose declared type does not match its content', async () => {
      prismaMock.serviceRecord.findUnique.mockResolvedValue(serviceRecord);

      await expect(
        service.upload(
          serviceRecordId,
          userId,
          { ...uploadedFile, mimetype: 'image/png' },
          createDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a file larger than 10 MB', async () => {
      prismaMock.serviceRecord.findUnique.mockResolvedValue(serviceRecord);

      await expect(
        service.upload(
          serviceRecordId,
          userId,
          { ...uploadedFile, size: 10 * 1024 * 1024 + 1 },
          createDto,
        ),
      ).rejects.toThrow(PayloadTooLargeException);

      expect(storageServiceMock.save).not.toHaveBeenCalled();
    });

    it('should delete the uploaded file when the database transaction fails', async () => {
      const storageKey = `service-records/${serviceRecordId}/before.jpg`;

      const transactionError = new Error('Database error');

      prismaMock.serviceRecord.findUnique.mockResolvedValue(serviceRecord);
      storageServiceMock.save.mockResolvedValue(storageKey);

      prismaMock.$transaction.mockRejectedValue(transactionError);

      await expect(
        service.upload(serviceRecordId, userId, uploadedFile, createDto),
      ).rejects.toThrow(transactionError);

      expect(storageServiceMock.delete).toHaveBeenCalledWith(storageKey);
    });

    it('should delete the uploaded file when creating the photo metadata fails', async () => {
      const storageKey = `service-records/${serviceRecordId}/before.jpg`;

      const transactionError = new Error('Failed to create photo');

      prismaMock.serviceRecord.findUnique.mockResolvedValue(serviceRecord);
      storageServiceMock.save.mockResolvedValue(storageKey);
      txMock.servicePhoto.create.mockRejectedValue(transactionError);

      await expect(
        service.upload(serviceRecordId, userId, uploadedFile, createDto),
      ).rejects.toThrow(transactionError);

      expect(storageServiceMock.delete).toHaveBeenCalledWith(storageKey);
    });
  });

  // ---------------------------------------------------------------------------
  // findByServiceRecord
  // ---------------------------------------------------------------------------

  describe('findByServiceRecord', () => {
    it('should return photos for a service record with generated URLs', async () => {
      const photos = [
        photo,
        {
          ...photo,
          id: 'photo-2',
          fileName: 'after.jpg',
          storageKey: 'service-records/service-record-1/after.jpg',
          caption: 'After maintenance',
        },
      ];

      prismaMock.serviceRecord.findUnique.mockResolvedValue(serviceRecord);
      prismaMock.servicePhoto.findMany.mockResolvedValue(photos);

      storageServiceMock.getUrl
        .mockResolvedValueOnce('https://storage/photo-before.jpg')
        .mockResolvedValueOnce('https://storage/photo-after.jpg');

      const result = await service.findByServiceRecord(serviceRecordId);

      expect(prismaMock.serviceRecord.findUnique).toHaveBeenCalledWith(
        serviceRecordQuery,
      );

      expect(prismaMock.servicePhoto.findMany).toHaveBeenCalledWith({
        where: {
          serviceRecordId,
        },
        orderBy: {
          uploadedAt: 'desc',
        },
      });

      expect(storageServiceMock.getUrl).toHaveBeenCalledTimes(2);

      expect(result).toEqual([
        {
          id: photo.id,
          serviceRecordId: photo.serviceRecordId,
          fileName: photo.fileName,
          mimeType: photo.mimeType,
          fileSize: photo.fileSize,
          caption: photo.caption,
          uploadedAt: photo.uploadedAt,
          url: 'https://storage/photo-before.jpg',
        },
        {
          id: 'photo-2',
          serviceRecordId,
          fileName: 'after.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024,
          caption: 'After maintenance',
          uploadedAt,
          url: 'https://storage/photo-after.jpg',
        },
      ]);
    });

    it('should return an empty array when the service record has no photos', async () => {
      prismaMock.serviceRecord.findUnique.mockResolvedValue(serviceRecord);
      prismaMock.servicePhoto.findMany.mockResolvedValue([]);

      const result = await service.findByServiceRecord(serviceRecordId);

      expect(result).toEqual([]);

      expect(storageServiceMock.getUrl).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the service record does not exist', async () => {
      prismaMock.serviceRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.findByServiceRecord(serviceRecordId),
      ).rejects.toThrow(new NotFoundException('Service record not found'));

      expect(prismaMock.servicePhoto.findMany).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------

  describe('update', () => {
    const updateDto = {
      caption: 'Updated caption',
    };

    const updatedPhoto = {
      ...photo,
      caption: 'Updated caption',
    };

    it('should update the photo successfully', async () => {
      prismaMock.servicePhoto.findUnique.mockResolvedValue({
        ...photo,
        serviceRecord: { technicianId: userId },
      });
      prismaMock.servicePhoto.update.mockResolvedValue(updatedPhoto);

      const result = await service.update(photoId, userId, updateDto);

      expect(prismaMock.servicePhoto.findUnique).toHaveBeenCalledWith({
        where: {
          id: photoId,
        },
        include: {
          serviceRecord: {
            select: {
              technicianId: true,
            },
          },
        },
      });

      expect(prismaMock.servicePhoto.update).toHaveBeenCalledWith({
        where: {
          id: photoId,
        },
        data: updateDto,
      });

      expect(result).toEqual(updatedPhoto);
    });

    it('should throw NotFoundException when the photo does not exist', async () => {
      prismaMock.servicePhoto.findUnique.mockResolvedValue(null);

      await expect(service.update(photoId, userId, updateDto)).rejects.toThrow(
        new NotFoundException('Service photo not found'),
      );

      expect(prismaMock.servicePhoto.update).not.toHaveBeenCalled();
    });

    it('should reject an update by another technician', async () => {
      prismaMock.servicePhoto.findUnique.mockResolvedValue({
        ...photo,
        serviceRecord: { technicianId: 'technician-2' },
      });

      await expect(service.update(photoId, userId, updateDto)).rejects.toThrow(
        ForbiddenException,
      );

      expect(prismaMock.servicePhoto.update).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------

  describe('remove', () => {
    it('should remove the photo, create an audit log, and delete the storage file', async () => {
      prismaMock.servicePhoto.findUnique.mockResolvedValue({
        ...photo,
        serviceRecord: {
          assetId,
          technicianId: userId,
        },
      });

      txMock.servicePhoto.delete.mockResolvedValue(photo);
      auditServiceMock.log.mockResolvedValue(undefined);
      storageServiceMock.delete.mockResolvedValue(undefined);

      const result = await service.remove(photoId, userId);

      expect(prismaMock.servicePhoto.findUnique).toHaveBeenCalledWith({
        where: {
          id: photoId,
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

      expect(txMock.servicePhoto.delete).toHaveBeenCalledWith({
        where: {
          id: photoId,
        },
      });

      expect(auditServiceMock.log).toHaveBeenCalledWith(
        {
          actorId: userId,
          assetId,
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
        txMock,
      );

      expect(storageServiceMock.delete).toHaveBeenCalledWith(photo.storageKey);

      expect(result).toEqual({
        ...photo,
        serviceRecord: {
          assetId,
          technicianId: userId,
        },
      });
    });

    it('should throw NotFoundException when the photo does not exist', async () => {
      prismaMock.servicePhoto.findUnique.mockResolvedValue(null);

      await expect(service.remove(photoId, userId)).rejects.toThrow(
        new NotFoundException('Service photo not found'),
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(storageServiceMock.delete).not.toHaveBeenCalled();
    });

    it('should reject removal by anyone other than the record technician', async () => {
      prismaMock.servicePhoto.findUnique.mockResolvedValue({
        ...photo,
        serviceRecord: {
          assetId,
          technicianId: 'technician-2',
        },
      });

      await expect(service.remove(photoId, userId)).rejects.toThrow(
        ForbiddenException,
      );

      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(storageServiceMock.delete).not.toHaveBeenCalled();
    });

    it('should still return the deleted photo when storage deletion fails', async () => {
      const storageError = new Error('Storage deletion failed');

      prismaMock.servicePhoto.findUnique.mockResolvedValue({
        ...photo,
        serviceRecord: {
          assetId,
          technicianId: userId,
        },
      });

      txMock.servicePhoto.delete.mockResolvedValue(photo);
      auditServiceMock.log.mockResolvedValue(undefined);
      storageServiceMock.delete.mockRejectedValue(storageError);

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const result = await service.remove(photoId, userId);

      expect(result).toEqual({
        ...photo,
        serviceRecord: {
          assetId,
          technicianId: userId,
        },
      });

      expect(storageServiceMock.delete).toHaveBeenCalledWith(photo.storageKey);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Failed to delete service photo from storage: ${photo.storageKey}`,
        storageError,
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
