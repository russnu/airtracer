import { Test, TestingModule } from '@nestjs/testing';
import { ServicePhotoController } from './service-photo.controller';
import { ServicePhotoService } from './service-photo.service';

describe('ServicePhotoController', () => {
  let controller: ServicePhotoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicePhotoController],
      providers: [ServicePhotoService],
    }).compile();

    controller = module.get<ServicePhotoController>(ServicePhotoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
