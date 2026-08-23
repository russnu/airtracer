import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { createClient } from '@supabase/supabase-js';

import { StorageService } from './storage.service';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid'),
}));

describe('StorageService', () => {
  let service: StorageService;

  const mockUpload = jest.fn();
  const mockRemove = jest.fn();
  const mockCreateSignedUrl = jest.fn();
  const mockFrom = jest.fn();

  const mockSupabase = {
    storage: {
      from: mockFrom,
    },
  };

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      const config: Record<string, string> = {
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SECRET_KEY: 'test-secret-key',
      };

      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockFrom.mockReturnValue({
      upload: mockUpload,
      remove: mockRemove,
      createSignedUrl: mockCreateSignedUrl,
    });

    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  describe('constructor', () => {
    it('should get Supabase configuration and create a client', () => {
      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('SUPABASE_URL');

      expect(mockConfigService.getOrThrow).toHaveBeenCalledWith(
        'SUPABASE_SECRET_KEY',
      );

      expect(createClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-secret-key',
      );
    });
  });

  describe('save', () => {
    const file = {
      originalname: 'test-photo.jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test image'),
    } as Express.Multer.File;

    it('should upload the file and return the storage key', async () => {
      mockUpload.mockResolvedValue({
        data: {
          path: 'service-records/test-uuid.jpg',
        },
        error: null,
      });

      const result = await service.save(file, 'service-records');

      expect(mockFrom).toHaveBeenCalledWith('service-photos');

      expect(mockUpload).toHaveBeenCalledWith(
        'service-records/test-uuid.jpg',
        file.buffer,
        {
          contentType: 'image/jpeg',
          upsert: false,
        },
      );

      expect(result).toBe('service-records/test-uuid.jpg');
    });

    it('should preserve the original file extension', async () => {
      mockUpload.mockResolvedValue({
        data: {
          path: 'service-records/test-uuid.png',
        },
        error: null,
      });

      const pngFile = {
        originalname: 'photo.png',
        mimetype: 'image/png',
        buffer: Buffer.from('png image'),
      } as Express.Multer.File;

      const result = await service.save(pngFile, 'service-records');

      expect(mockUpload).toHaveBeenCalledWith(
        'service-records/test-uuid.png',
        pngFile.buffer,
        {
          contentType: 'image/png',
          upsert: false,
        },
      );

      expect(result).toBe('service-records/test-uuid.png');
    });

    it('should throw InternalServerErrorException when upload fails', async () => {
      mockUpload.mockResolvedValue({
        data: null,
        error: {
          message: 'Upload failed',
        },
      });

      await expect(service.save(file, 'service-records')).rejects.toThrow(
        new InternalServerErrorException('Failed to upload file'),
      );
    });
  });

  describe('delete', () => {
    it('should remove the file from storage', async () => {
      mockRemove.mockResolvedValue({
        data: null,
        error: null,
      });

      await service.delete('service-records/test-uuid.jpg');

      expect(mockFrom).toHaveBeenCalledWith('service-photos');

      expect(mockRemove).toHaveBeenCalledWith([
        'service-records/test-uuid.jpg',
      ]);
    });

    it('should throw InternalServerErrorException when deletion fails', async () => {
      mockRemove.mockResolvedValue({
        data: null,
        error: {
          message: 'Delete failed',
        },
      });

      await expect(
        service.delete('service-records/test-uuid.jpg'),
      ).rejects.toThrow(
        new InternalServerErrorException('Failed to delete file'),
      );
    });
  });

  describe('getUrl', () => {
    it('should generate a signed URL for 1 hour', async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: {
          signedUrl: 'https://test.supabase.co/signed-url',
        },
        error: null,
      });

      const result = await service.getUrl('service-records/test-uuid.jpg');

      expect(mockFrom).toHaveBeenCalledWith('service-photos');

      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        'service-records/test-uuid.jpg',
        60 * 60,
      );

      expect(result).toBe('https://test.supabase.co/signed-url');
    });

    it('should throw InternalServerErrorException when URL generation fails', async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: null,
        error: {
          message: 'Signed URL generation failed',
        },
      });

      await expect(
        service.getUrl('service-records/test-uuid.jpg'),
      ).rejects.toThrow(
        new InternalServerErrorException('Failed to generate file URL'),
      );
    });
  });
});
