export class PublicServiceRecordDto {
  id!: string;
  serviceDate!: Date;
  serviceType!: string;
  description?: string | null;

  measurements?: {
    suctionPressure: number | null;
    dischargePressure: number | null;
    current: number | null;
    voltage: number | null;
  };

  findings?: string | null;
  recommendations?: string | null;

  technician!: {
    name: string;
  } | null;

  //   photos: {
  //     id: string;
  //     url: string;
  //   }[];
}
