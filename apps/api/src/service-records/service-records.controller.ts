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
  // Declared before `/service-records/:id` so "mine" is not read as an ID.
  @Roles(RoleName.TECHNICIAN)
  @Get('/service-records/mine')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.serviceRecordService.findByTechnician(user.id);
  }
  //-------------------------------------------------------------//
  // Any owner or technician may read any service record.
  @Roles(RoleName.OWNER, RoleName.TECHNICIAN)
  @Get('/service-records/:id')
  findOne(@Param('id') id: string) {
    return this.serviceRecordService.findOne(id);
  }
  //-------------------------------------------------------------//
  @Roles(RoleName.OWNER, RoleName.TECHNICIAN)
  @Get('/assets/:assetId/service-records')
  findByAsset(@Param('assetId') assetId: string) {
    return this.serviceRecordService.findByAsset(assetId);
  }
  //-------------------------------------------------------------//
  // Only the technician who created the record; see ALLOWED_STATUS_TRANSITIONS.
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
