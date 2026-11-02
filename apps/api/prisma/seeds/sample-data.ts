import { ServiceOutcome } from '../../generated/prisma/client';

import { EquipmentTypeName } from './equipment-type.seed';

// Mock demonstration data (PRD §7.4): every serial carries a DEMO marker and
// all of it belongs to the demo owner and technician. Times are UTC.

export interface SampleServiceRecord {
  recordedAt: string;
  serviceDate: string;
  serviceType: string;
  description: string | null;
  outcome: ServiceOutcome;
  // Pressures in PSI, current in A, voltage in V, temperatures in °C.
  suctionPressure: number | null;
  dischargePressure: number | null;
  current: number | null;
  voltage: number | null;
  returnAirTemp: number | null;
  supplyAirTemp: number | null;
  findings: string | null;
  recommendations: string | null;
  clientRequestId: string | null;
  voided: { at: string; reason: string } | null;
}

export interface SampleAsset {
  equipmentType: EquipmentTypeName;
  brand: string;
  model: string;
  serialNumber: string | null;
  refrigerant: string | null;
  capacity: number | null;
  capacityUnit: string | null;
  installationDate: string | null;
  // Location at registration; locationChange moves it later.
  location: string | null;
  createdAt: string;
  qrGeneratedAt: string | null;
  locationChange: { to: string; at: string } | null;
  serviceRecords: SampleServiceRecord[];
  deactivatedAt: string | null;
}

export const SAMPLE_ASSETS: SampleAsset[] = [
  {
    equipmentType: 'Wall-Mounted Split-Type',
    brand: 'Daikin',
    model: 'FTKF35',
    serialNumber: 'DAIKIN-DEMO-0001',
    refrigerant: 'R32',
    capacity: 1.5,
    capacityUnit: 'HP',
    installationDate: '2025-01-15T00:00:00.000Z',
    location: 'Living Room',
    createdAt: '2025-01-15T09:00:00.000Z',
    qrGeneratedAt: '2025-01-15T09:05:00.000Z',
    locationChange: { to: 'Master Bedroom', at: '2025-02-01T10:00:00.000Z' },
    serviceRecords: [
      {
        recordedAt: '2025-07-15T11:30:00.000Z',
        serviceDate: '2025-07-15T09:00:00.000Z',
        serviceType: 'Preventive Maintenance',
        description:
          'Routine preventive maintenance: filter and coil cleaning, drain line flush, and performance test.',
        outcome: ServiceOutcome.RESOLVED,
        suctionPressure: 125,
        dischargePressure: 360,
        current: 4.2,
        voltage: 230,
        returnAirTemp: 27.5,
        supplyAirTemp: 14.5,
        findings:
          'Filters moderately dirty; light dust on the indoor coil. Operating pressures and temperature split are normal.',
        recommendations:
          'Clean filters monthly and schedule the next preventive maintenance in six months.',
        clientRequestId: null,
        voided: null,
      },
      {
        recordedAt: '2025-10-05T08:15:00.000Z',
        serviceDate: '2025-10-05T08:00:00.000Z',
        serviceType: 'Inspection',
        description: 'Inspection visit.',
        outcome: ServiceOutcome.UNABLE_TO_COMPLETE,
        suctionPressure: null,
        dischargePressure: null,
        current: null,
        voltage: null,
        returnAirTemp: null,
        supplyAirTemp: null,
        findings: null,
        recommendations: null,
        clientRequestId: null,
        voided: {
          at: '2025-10-05T10:15:00.000Z',
          reason:
            'Logged against the wrong unit; the inspection was for a different system.',
        },
      },
    ],
    deactivatedAt: null,
  },
  {
    equipmentType: 'Window-Type',
    brand: 'Carrier',
    model: 'Aura Inverter 1.0 HP',
    serialNumber: 'CARRIER-DEMO-0001',
    refrigerant: 'R32',
    capacity: 1.0,
    capacityUnit: 'HP',
    installationDate: '2025-03-10T00:00:00.000Z',
    location: 'Bedroom',
    createdAt: '2025-03-10T09:00:00.000Z',
    qrGeneratedAt: '2025-03-10T09:10:00.000Z',
    locationChange: null,
    serviceRecords: [
      {
        recordedAt: '2025-08-20T10:45:00.000Z',
        serviceDate: '2025-08-20T09:30:00.000Z',
        serviceType: 'Inspection',
        description:
          'Inspection after the owner reported weak cooling in the afternoon.',
        outcome: ServiceOutcome.FOLLOW_UP_NEEDED,
        // Sealed window unit: no service ports, so no pressure readings.
        suctionPressure: null,
        dischargePressure: null,
        current: 5.6,
        voltage: 228,
        returnAirTemp: 29,
        supplyAirTemp: 21,
        findings:
          'Low temperature split. Condenser fins heavily clogged; fan motor drawing higher current than rated.',
        recommendations:
          'Return for a full condenser cleaning and fan motor check.',
        clientRequestId: null,
        voided: null,
      },
      {
        recordedAt: '2025-09-02T13:20:00.000Z',
        serviceDate: '2025-09-02T10:00:00.000Z',
        serviceType: 'Repair',
        description:
          'Condenser coil chemical cleaning and fan motor bearing lubrication.',
        outcome: ServiceOutcome.RESOLVED,
        suctionPressure: null,
        dischargePressure: null,
        current: 4.4,
        voltage: 229,
        returnAirTemp: 28,
        supplyAirTemp: 15.5,
        findings:
          'Cooling restored after cleaning; fan current back within the rated range.',
        recommendations: 'Clean the condenser every six months.',
        // Recorded offline on site and synced later.
        clientRequestId: '6f1c2a4e-8b3d-4c5e-9f7a-1d2e3c4b5a60',
        voided: null,
      },
    ],
    deactivatedAt: null,
  },
  {
    equipmentType: 'Portable',
    brand: 'LG',
    model: 'LP1419IVSM',
    serialNumber: 'LG-DEMO-0001',
    refrigerant: 'R290',
    capacity: 1.0,
    capacityUnit: 'HP',
    installationDate: '2024-11-05T00:00:00.000Z',
    location: 'Office',
    createdAt: '2024-11-05T09:00:00.000Z',
    qrGeneratedAt: '2024-11-05T09:10:00.000Z',
    locationChange: null,
    serviceRecords: [
      {
        recordedAt: '2025-06-10T12:00:00.000Z',
        serviceDate: '2025-06-10T10:00:00.000Z',
        serviceType: 'Repair',
        description: 'Diagnosis after the unit stopped cooling.',
        outcome: ServiceOutcome.UNABLE_TO_COMPLETE,
        suctionPressure: null,
        dischargePressure: null,
        current: 0.6,
        voltage: 231,
        returnAirTemp: 30,
        supplyAirTemp: 29.5,
        findings:
          'Compressor does not start; fan runs. Compressor windings open.',
        recommendations:
          'Compressor replacement is not economical for this unit. Replace the unit.',
        clientRequestId: null,
        voided: null,
      },
    ],
    deactivatedAt: '2025-06-20T08:00:00.000Z',
  },
  {
    // No serial and no QR yet: shows the empty history and generate-QR states.
    equipmentType: 'Ceiling Cassette',
    brand: 'Daikin',
    model: 'FCFC71',
    serialNumber: null,
    refrigerant: 'R32',
    capacity: 3.0,
    capacityUnit: 'HP',
    installationDate: '2025-10-18T00:00:00.000Z',
    location: 'Conference Room',
    createdAt: '2025-10-20T09:00:00.000Z',
    qrGeneratedAt: null,
    locationChange: null,
    serviceRecords: [],
    deactivatedAt: null,
  },
];
