import { Controller, Post, Get, Body, Param, Patch } from '@nestjs/common';
import { ServiceRecordsService } from './service-records.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../roles/enums/role-name.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateServiceRecordDto } from './dto/create-service-record.dto';
import { UpdateServiceRecordStatusDto } from './dto/update-service-record-status.dto';

@Controller()
export class ServiceRecordsController {
  constructor(private readonly serviceRecordService: ServiceRecordsService) {}
  //-------------------------------------------------------------//
  @Roles(RoleName.TECHNICIAN)
  @Post('/assets/:assetId/service-records')
  create(
    @Param('assetId') assetId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateServiceRecordDto,
  ) {
    return this.serviceRecordService.create(assetId, user.id, dto);
  }
  //-------------------------------------------------------------//
  @Roles(RoleName.OWNER)
  @Get('/service-records/:id')
  findOne(@Param('id') id: string) {
    return this.serviceRecordService.findOne(id);
  }
  //-------------------------------------------------------------//
  @Roles(RoleName.OWNER)
  @Get('/assets/:assetId/service-records')
  findByAsset(@Param('assetId') assetId: string) {
    return this.serviceRecordService.findByAsset(assetId);
  }
  //-------------------------------------------------------------//
  @Roles(RoleName.TECHNICIAN)
  @Patch('/service-records/:id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateServiceRecordStatusDto,
  ) {
    return this.serviceRecordService.updateStatus(id, user.id, dto);
  }
}
