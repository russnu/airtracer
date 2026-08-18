import { PartialType } from '@nestjs/mapped-types';
import { CreateQrDto } from './create-qr.dto';

export class UpdateQrDto extends PartialType(CreateQrDto) {}
