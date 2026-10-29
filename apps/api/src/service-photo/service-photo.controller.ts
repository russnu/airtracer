import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ServicePhotoService } from './service-photo.service';
import { CreateServicePhotoDto } from './dto/create-service-photo.dto';
import { UpdateServicePhotoDto } from './dto/update-service-photo.dto';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../roles/enums/role-name.enum';
import { MAX_PHOTO_SIZE_BYTES } from './utils/image-file.util';

@Controller('service-photo')
export class ServicePhotoController {
  constructor(private readonly servicePhotoService: ServicePhotoService) {}
  //-------------------------------------------------------------//
  // Only the technician who created the service record may add photos.
  @Roles(RoleName.TECHNICIAN)
  @Post(':serviceRecordId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_PHOTO_SIZE_BYTES, files: 1 },
    }),
  )
  upload(
    @Param('serviceRecordId') serviceRecordId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateServicePhotoDto,
  ) {
    return this.servicePhotoService.upload(serviceRecordId, user.id, file, dto);
  }
  //-------------------------------------------------------------//
  // The asset owner or the record's technician may view photos.
  @Get(':serviceRecordId')
  findByServiceRecord(
    @Param('serviceRecordId') serviceRecordId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.servicePhotoService.findByServiceRecord(
      serviceRecordId,
      user.id,
    );
  }
  //-------------------------------------------------------------//
  @Roles(RoleName.TECHNICIAN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateServicePhotoDto: UpdateServicePhotoDto,
  ) {
    return this.servicePhotoService.update(id, user.id, updateServicePhotoDto);
  }
  //-------------------------------------------------------------//
  @Roles(RoleName.TECHNICIAN)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.servicePhotoService.remove(id, user.id);
  }
}
