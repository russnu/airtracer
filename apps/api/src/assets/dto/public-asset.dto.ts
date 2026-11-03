import { EquipmentType } from '../../../generated/prisma/enums';

export class PublicAssetDto {
  id!: string;
  brand!: string;
  model!: string;
  serialNumber?: string | null;
  equipmentType!: EquipmentType;
  installationDate?: Date | null;
  location?: string | null;
}
