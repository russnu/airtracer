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

@Controller('service-photo')
export class ServicePhotoController {
  constructor(private readonly servicePhotoService: ServicePhotoService) {}

  //-------------------------------------------------------------//
  @Post(':serviceRecordId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  upload(
    @Param('serviceRecordId') serviceRecordId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateServicePhotoDto,
  ) {
    return this.servicePhotoService.upload(serviceRecordId, file, dto);
  }

  //-------------------------------------------------------------//
  @Get(':serviceRecordId')
  findByServiceRecord(@Param('serviceRecordId') serviceRecordId: string) {
    return this.servicePhotoService.findByServiceRecord(serviceRecordId);
  }

  //-------------------------------------------------------------//
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateServicePhotoDto: UpdateServicePhotoDto,
  ) {
    return this.servicePhotoService.update(id, updateServicePhotoDto);
  }

  //-------------------------------------------------------------//
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.servicePhotoService.remove(id);
  }
}
