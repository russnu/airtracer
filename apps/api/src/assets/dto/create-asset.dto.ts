import { EquipmentType } from '../../../generated/prisma/enums';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  brand!: string;

  @IsString()
  @IsNotEmpty()
  model!: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsEnum(EquipmentType)
  equipmentType!: EquipmentType;

  @IsOptional()
  @IsString()
  refrigerant?: string;

  @IsOptional()
  @IsNumber()
  capacity?: number;

  @IsOptional()
  @IsString()
  capacityUnit?: string;

  @IsOptional()
  @IsDateString()
  installationDate?: string;

  @IsOptional()
  @IsString()
  location?: string;
}
