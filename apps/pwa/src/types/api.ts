// ===== Enums =====

export type RoleName = 'OWNER' | 'TECHNICIAN' | 'ADMIN';

export type ServiceStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// ===== Auth =====

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface AuthResponse {
  accessToken: string;
  user: UserResponse;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: 'OWNER' | 'TECHNICIAN';
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ===== Equipment Types =====

export interface EquipmentType {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ===== Assets =====

export interface QRCode {
  id: string;
  token: string;
  assetId: string;
  isActive: boolean;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  brand: string;
  model: string;
  serialNumber: string | null;
  isActive: boolean;
  equipmentTypeId: string;
  equipmentType: EquipmentType;
  refrigerant: string | null;
  capacity: number | null;
  capacityUnit: string | null;
  installationDate: string | null;
  location: string | null;
  ownerId: string;
  qrCode: QRCode | null;
  serviceRecords?: ServiceRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetPayload {
  brand: string;
  model: string;
  serialNumber?: string;
  equipmentTypeId: string;
  refrigerant?: string;
  capacity?: number;
  capacityUnit?: string;
  installationDate?: string;
  location?: string;
}

export type UpdateAssetPayload = Partial<CreateAssetPayload>;

// ===== QR =====

export interface QRCreateResponse {
  id: string;
  token: string;
  url: string;
  asset: Asset;
}

export interface PublicAsset {
  id: string;
  brand: string;
  model: string;
  serialNumber: string | null;
  equipmentType: string;
  installationDate: string | null;
  location: string | null;
}

export interface PublicServiceRecord {
  id: string;
  serviceDate: string;
  serviceType: string;
  description: string | null;
  measurements: {
    suctionPressure: number | null;
    dischargePressure: number | null;
    current: number | null;
    voltage: number | null;
    returnAirTemp: number | null;
    supplyAirTemp: number | null;
  };
  findings: string | null;
  recommendations: string | null;
  technician: { name: string } | null;
  photos: { id: string; url: string }[];
}

export interface PublicPassportResponse {
  asset: PublicAsset;
  serviceHistory: PublicServiceRecord[];
}

// ===== Service Records =====

export interface ServiceRecord {
  id: string;
  assetId: string;
  technicianId: string;
  serviceDate: string;
  serviceType: string;
  description: string | null;
  status: ServiceStatus;
  suctionPressure: number | null;
  dischargePressure: number | null;
  current: number | null;
  voltage: number | null;
  returnAirTemp: number | null;
  supplyAirTemp: number | null;
  findings: string | null;
  recommendations: string | null;
  photos?: ServicePhoto[];
  /** Included by GET /service-records/:id and /service-records/mine. */
  asset?: ServiceRecordAsset;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRecordAsset {
  id: string;
  brand: string;
  model: string;
  serialNumber: string | null;
  location: string | null;
  ownerId: string;
}

/** An item from GET /service-records/mine. */
export interface TechnicianServiceRecord extends ServiceRecord {
  asset: ServiceRecordAsset;
  photoCount: number;
}

export interface CreateServiceRecordPayload {
  /** Idempotency key (UUID v4): a repeated create returns the stored record. */
  clientRequestId?: string;
  /** When the device captured the record; recorded in the audit log only. */
  clientCapturedAt?: string;
  serviceDate: string;
  serviceType: string;
  description?: string;
  suctionPressure?: number;
  dischargePressure?: number;
  current?: number;
  voltage?: number;
  returnAirTemp?: number;
  supplyAirTemp?: number;
  findings?: string;
  recommendations?: string;
}

export interface UpdateServiceRecordStatusPayload {
  status: ServiceStatus;
}

// ===== Service Photos =====

export interface ServicePhoto {
  id: string;
  serviceRecordId: string;
  fileName: string;
  storageKey: string;
  mimeType: string | null;
  fileSize: number | null;
  caption: string | null;
  uploadedAt: string;
}

export interface ServicePhotoWithUrl {
  id: string;
  url: string;
  caption?: string | null;
  fileName?: string;
  mimeType?: string | null;
  fileSize?: number | null;
}

// ===== API Error =====

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}
