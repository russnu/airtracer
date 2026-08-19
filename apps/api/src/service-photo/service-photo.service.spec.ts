import { Test, TestingModule } from '@nestjs/testing';
import { ServicePhotoService } from './service-photo.service';

describe('ServicePhotoService', () => {
  let service: ServicePhotoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServicePhotoService],
    }).compile();

    service = module.get<ServicePhotoService>(ServicePhotoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
