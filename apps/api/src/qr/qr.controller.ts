import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { QrService } from './qr.service';

@Controller('qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}
  //-------------------------------------------------------------//
  @Post('assets/:assetId')
  create(@Param('assetId') assetId: string) {
    return this.qrService.createForAsset(assetId);
  }
  //-------------------------------------------------------------//
  @Get(':token')
  findByToken(@Param('token') token: string) {
    return this.qrService.validate(token);
  }
  //-------------------------------------------------------------//
  @Get('assets/:assetId')
  findByAssetId(@Param('assetId') assetId: string) {
    return this.qrService.findByAssetId(assetId);
  }
  //-------------------------------------------------------------//
  @Post('assets/:assetId/regenerate')
  regenerate(@Param('assetId') assetId: string) {
    return this.qrService.regenerateForAsset(assetId);
  }
  //-------------------------------------------------------------//
  @Patch(':token/deactivate')
  deactivate(@Param('token') token: string) {
    return this.qrService.deactivate(token);
  }
  //-------------------------------------------------------------//
  @Patch(':token/activate')
  activate(@Param('token') token: string) {
    return this.qrService.activate(token);
  }
  //-------------------------------------------------------------//
}
