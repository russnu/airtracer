import { Module } from '@nestjs/common';
import { ServiceRecordsController } from './service-records.controller';
import { ServiceRecordsService } from './service-records.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ServiceRecordsController],
  providers: [ServiceRecordsService],
})
export class ServiceRecordsModule {}
