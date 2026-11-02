import { PublicAssetDto } from '../../assets/dto/public-asset.dto';
import { PublicServiceRecordDto } from '../../service-records/dto/public-service-record.dto';

export class PublicPassportResponseDto {
  url!: string;
  asset!: PublicAssetDto;
  serviceHistory!: PublicServiceRecordDto[];
}
