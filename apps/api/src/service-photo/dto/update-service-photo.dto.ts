import { PartialType } from '@nestjs/mapped-types';
import { CreateServicePhotoDto } from './create-service-photo.dto';

export class UpdateServicePhotoDto extends PartialType(CreateServicePhotoDto) {}
