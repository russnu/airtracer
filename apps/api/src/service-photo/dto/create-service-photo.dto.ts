import { IsOptional, IsString, MaxLength } from 'class-validator';
export class CreateServicePhotoDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  caption?: string;
}
