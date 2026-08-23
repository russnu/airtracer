import { Test, TestingModule } from '@nestjs/testing';

import { ServicePhotoController } from './service-photo.controller';
import { ServicePhotoService } from './service-photo.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

describe('ServicePhotoController', () => {
  let controller: ServicePhotoController;

  const servicePhotoServiceMock = {
    upload: jest.fn(),
    findByServiceRecord: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const user: AuthenticatedUser = {
    id: 'user-1',
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: null,
    isVerified: true,
    isActive: true,
    lastLoginAt: null,
    passwordChangedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [
      {
        role: {
          id: 'role-1',
          name: 'TECHNICIAN',
          description: 'Technician',
        },
      },
    ],
  };

  const file = {
    originalname: 'before.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('test'),
  } as Express.Multer.File;

  const createDto = {
    caption: 'Before maintenance',
  };

  const updateDto = {
    caption: 'Updated caption',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicePhotoController],
      providers: [
        {
          provide: ServicePhotoService,
          useValue: servicePhotoServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ServicePhotoController>(ServicePhotoController);
  });

  // ---------------------------------------------------------------------------
  // upload
  // ---------------------------------------------------------------------------

  describe('upload', () => {
    it('should upload a service photo', async () => {
      const serviceRecordId = 'service-record-1';

      const expectedResult = {
        id: 'photo-1',
        serviceRecordId,
        fileName: 'before.jpg',
      };

      servicePhotoServiceMock.upload.mockResolvedValue(expectedResult);

      const result = await controller.upload(
        serviceRecordId,
        file,
        user,
        createDto,
      );

      expect(servicePhotoServiceMock.upload).toHaveBeenCalledWith(
        serviceRecordId,
        user.id,
        file,
        createDto,
      );

      expect(result).toEqual(expectedResult);
    });
  });

  // ---------------------------------------------------------------------------
  // findByServiceRecord
  // ---------------------------------------------------------------------------

  describe('findByServiceRecord', () => {
    it('should return all photos for a service record', async () => {
      const serviceRecordId = 'service-record-1';

      const expectedResult = [
        {
          id: 'photo-1',
          serviceRecordId,
          fileName: 'before.jpg',
        },
        {
          id: 'photo-2',
          serviceRecordId,
          fileName: 'after.jpg',
        },
      ];

      servicePhotoServiceMock.findByServiceRecord.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.findByServiceRecord(serviceRecordId);

      expect(servicePhotoServiceMock.findByServiceRecord).toHaveBeenCalledWith(
        serviceRecordId,
      );

      expect(result).toEqual(expectedResult);
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------

  describe('update', () => {
    it('should update a service photo', async () => {
      const photoId = 'photo-1';

      const expectedResult = {
        id: photoId,
        caption: 'Updated caption',
      };

      servicePhotoServiceMock.update.mockResolvedValue(expectedResult);

      const result = await controller.update(photoId, updateDto);

      expect(servicePhotoServiceMock.update).toHaveBeenCalledWith(
        photoId,
        updateDto,
      );

      expect(result).toEqual(expectedResult);
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------

  describe('remove', () => {
    it('should remove a service photo', async () => {
      const photoId = 'photo-1';

      const expectedResult = {
        id: photoId,
        fileName: 'before.jpg',
      };

      servicePhotoServiceMock.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(photoId, user);

      expect(servicePhotoServiceMock.remove).toHaveBeenCalledWith(
        photoId,
        user.id,
      );

      expect(result).toEqual(expectedResult);
    });
  });
});
