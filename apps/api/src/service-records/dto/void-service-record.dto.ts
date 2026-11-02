import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class VoidServiceRecordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
