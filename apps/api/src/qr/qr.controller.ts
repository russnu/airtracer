import { Controller, Get, Post, Patch, Param } from '@nestjs/common';
import { QrService } from './qr.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../roles/enums/role-name.enum';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}
  //-------------------------------------------------------------//
  @Roles(RoleName.OWNER)
  @Post('assets/:assetId')
  createForAsset(
    @Param('assetId') assetId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.qrService.createForAsset(assetId, user.id);
  }
  //-------------------------------------------------------------//
  @Public()
  @Get(':token')
  findByToken(@Param('token') token: string) {
    return this.qrService.getPublicPassport(token);
  }
  //-------------------------------------------------------------//
  @Roles(RoleName.OWNER)
  @Post('assets/:assetId/regenerate')
  regenerate(
    @Param('assetId') assetId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.qrService.regenerateForAsset(assetId, user.id);
  }
  //-------------------------------------------------------------//
  @Roles(RoleName.OWNER)
  @Patch(':token/deactivate')
  deactivate(
    @Param('token') token: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.qrService.deactivate(token, user.id);
  }
  //-------------------------------------------------------------//
  @Roles(RoleName.OWNER)
  @Patch(':token/activate')
  activate(
    @Param('token') token: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.qrService.activate(token, user.id);
  }
  //-------------------------------------------------------------//
}
