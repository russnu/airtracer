import { Test, TestingModule } from '@nestjs/testing';
import { ServiceRecordsController } from './service-records.controller';

describe('ServiceRecordsController', () => {
  let controller: ServiceRecordsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceRecordsController],
    }).compile();

    controller = module.get<ServiceRecordsController>(ServiceRecordsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
