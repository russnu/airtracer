export class PublicAssetDto {
  id!: string;
  brand!: string;
  model!: string;
  serialNumber?: string | null;
  equipmentType!: string;
  installationDate?: Date | null;
  location?: string | null;
}
