import { Test, TestingModule } from '@nestjs/testing';
import { ServiceRecordsService } from './service-records.service';

describe('ServiceRecordsService', () => {
  let service: ServiceRecordsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceRecordsService],
    }).compile();

    service = module.get<ServiceRecordsService>(ServiceRecordsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
