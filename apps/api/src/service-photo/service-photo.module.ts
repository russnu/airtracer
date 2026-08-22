import { Module } from '@nestjs/common';
import { ServicePhotoService } from './service-photo.service';
import { ServicePhotoController } from './service-photo.controller';
import { StorageModule } from '../storage/storage.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [StorageModule, AuditModule],
  controllers: [ServicePhotoController],
  providers: [ServicePhotoService],
})
export class ServicePhotoModule {}
