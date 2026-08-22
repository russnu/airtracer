import { IsEnum } from 'class-validator';
import { ServiceStatus } from '../../../generated/prisma/enums';

export class UpdateServiceRecordStatusDto {
  @IsEnum(ServiceStatus)
  status!: ServiceStatus;
}
