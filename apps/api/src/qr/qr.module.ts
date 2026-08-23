import { Module } from '@nestjs/common';
import { QrService } from './qr.service';
import { QrController } from './qr.controller';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [AuditModule, StorageModule],
  controllers: [QrController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
