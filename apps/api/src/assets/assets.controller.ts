import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../roles/enums/role-name.enum';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}
  //-------------------------------------------------------------//
  @Roles(RoleName.OWNER)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAssetDto) {
    return this.assetsService.create(user.id, dto);
  }
  //-------------------------------------------------------------//
  @Roles(RoleName.OWNER)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.assetsService.findAll(user.id);
  }
  //-------------------------------------------------------------//
  @Roles(RoleName.OWNER)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.assetsService.findOne(id, user.id);
  }
  //-------------------------------------------------------------//
  @Roles(RoleName.OWNER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetsService.update(id, user.id, dto);
  }
  //-------------------------------------------------------------//
  @Roles(RoleName.OWNER)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.assetsService.remove(id, user.id);
  }
}
