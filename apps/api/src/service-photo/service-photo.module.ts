import { Module } from '@nestjs/common';
import { ServicePhotoService } from './service-photo.service';
import { ServicePhotoController } from './service-photo.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [ServicePhotoController],
  providers: [ServicePhotoService],
})
export class ServicePhotoModule {}
