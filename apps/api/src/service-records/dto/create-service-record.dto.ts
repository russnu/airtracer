import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsUUID,
} from 'class-validator';
export class CreateServiceRecordDto {
  // Client-generated idempotency key: repeating a create with the same key
  // returns the record that was already stored instead of a duplicate.
  @IsOptional()
  @IsUUID('4')
  clientRequestId?: string;

  // When the device captured the record, as reported by the client. Stored in
  // the audit log for information only; the device clock is not trusted.
  @IsOptional()
  @IsDateString()
  clientCapturedAt?: string;

  @IsDateString()
  serviceDate!: string;

  @IsString()
  @IsNotEmpty()
  serviceType!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  suctionPressure?: number;

  @IsOptional()
  @IsNumber()
  dischargePressure?: number;

  @IsOptional()
  @IsNumber()
  current?: number;

  @IsOptional()
  @IsNumber()
  voltage?: number;

  @IsOptional()
  @IsNumber()
  returnAirTemp?: number;

  @IsOptional()
  @IsNumber()
  supplyAirTemp?: number;

  @IsOptional()
  @IsString()
  findings?: string;

  @IsOptional()
  @IsString()
  recommendations?: string;
}
