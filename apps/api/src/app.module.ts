import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { QrModule } from './qr/qr.module';
import { AssetsModule } from './assets/assets.module';
import { ServiceRecordsService } from './service-records/service-records.service';
import { ServiceRecordsController } from './service-records/service-records.controller';
import { ServiceRecordsModule } from './service-records/service-records.module';
import { ServicePhotoModule } from './service-photo/service-photo.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UsersModule,
    PrismaModule,
    AuthModule,
    QrModule,
    AssetsModule,
    ServiceRecordsModule,
    ServicePhotoModule,
    StorageModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    ServiceRecordsService,
  ],
  controllers: [ServiceRecordsController],
})
export class AppModule {}
