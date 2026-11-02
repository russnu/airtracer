import { ServiceOutcome } from '../../../generated/prisma/enums';

export class PublicServiceRecordDto {
  id!: string;
  serviceDate!: Date;
  serviceType!: string;
  description?: string | null;
  outcome!: ServiceOutcome | null;
  voidedAt!: Date | null;
  voidReason!: string | null;

  measurements?: {
    suctionPressure: number | null;
    dischargePressure: number | null;
    current: number | null;
    voltage: number | null;
    returnAirTemp: number | null;
    supplyAirTemp: number | null;
  };

  findings?: string | null;
  recommendations?: string | null;

  technician!: {
    name: string;
  } | null;

  photos!: {
    id: string;
    url: string;
  }[];
}
