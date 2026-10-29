import type {
  ApiError,
  Asset,
  AuthResponse,
  CreateAssetPayload,
  CreateServiceRecordPayload,
  LoginPayload,
  PublicPassportResponse,
  QRCreateResponse,
  RegisterPayload,
  ServiceRecord,
  ServicePhotoWithUrl,
  UpdateAssetPayload,
  UpdateServiceRecordStatusPayload,
  UserResponse,
} from '../types/api';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

// ===== Token Management =====

const TOKEN_KEY = 'airtracer_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ===== HTTP Client =====

class ApiClientError extends Error {
  statusCode: number;
  details?: string[];

  constructor(
    statusCode: number,
    message: string,
    details?: string[],
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * The request never reached the API or got no response: the device is offline,
 * the server is unreachable, or the request timed out.
 */
class NetworkError extends Error {
  constructor(cause: unknown) {
    super('Unable to reach the AirTracer server.', { cause });
    this.name = 'NetworkError';
  }
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Only set Content-Type for non-FormData bodies
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw new NetworkError(error);
  }

  if (!response.ok) {
    let errorData: ApiError | undefined;
    try {
      errorData = await response.json();
    } catch {
      // Response body may not be JSON
    }

    const message = errorData
      ? Array.isArray(errorData.message)
        ? errorData.message.join(', ')
        : errorData.message
      : `Request failed with status ${response.status}`;

    const details = errorData && Array.isArray(errorData.message)
      ? errorData.message
      : undefined;

    throw new ApiClientError(response.status, message, details);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ===== Auth =====

export const authApi = {
  register(data: RegisterPayload): Promise<AuthResponse> {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  login(data: LoginPayload): Promise<AuthResponse> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  me(): Promise<UserResponse> {
    return request('/auth/me');
  },
};

// ===== Assets =====

export const assetsApi = {
  findAll(): Promise<Asset[]> {
    return request('/assets');
  },

  findOne(id: string): Promise<Asset> {
    return request(`/assets/${id}`);
  },

  create(data: CreateAssetPayload): Promise<Asset> {
    return request('/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update(id: string, data: UpdateAssetPayload): Promise<Asset> {
    return request(`/assets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deactivate(id: string): Promise<Asset> {
    return request(`/assets/${id}/deactivate`, {
      method: 'PATCH',
    });
  },

  remove(id: string): Promise<void> {
    return request(`/assets/${id}`, {
      method: 'DELETE',
    });
  },
};

// ===== QR Codes =====

export const qrApi = {
  createForAsset(assetId: string): Promise<QRCreateResponse> {
    return request(`/qr/assets/${assetId}`, {
      method: 'POST',
    });
  },

  regenerate(assetId: string): Promise<QRCreateResponse> {
    return request(`/qr/assets/${assetId}/regenerate`, {
      method: 'POST',
    });
  },

  getPublicPassport(token: string): Promise<PublicPassportResponse> {
    return request(`/qr/${token}`);
  },

  deactivate(token: string): Promise<void> {
    return request(`/qr/${token}/deactivate`, {
      method: 'PATCH',
    });
  },

  activate(token: string): Promise<void> {
    return request(`/qr/${token}/activate`, {
      method: 'PATCH',
    });
  },
};

// ===== Service Records =====

export const serviceRecordsApi = {
  create(
    assetId: string,
    data: CreateServiceRecordPayload,
    signal?: AbortSignal,
  ): Promise<ServiceRecord> {
    return request(`/assets/${assetId}/service-records`, {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
    });
  },

  findOne(id: string): Promise<ServiceRecord> {
    return request(`/service-records/${id}`);
  },

  findByAsset(assetId: string): Promise<ServiceRecord[]> {
    return request(`/assets/${assetId}/service-records`);
  },

  updateStatus(
    id: string,
    data: UpdateServiceRecordStatusPayload,
  ): Promise<ServiceRecord> {
    return request(`/service-records/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// ===== Service Photos =====

export const servicePhotosApi = {
  upload(
    serviceRecordId: string,
    file: File,
    caption?: string,
  ): Promise<ServicePhotoWithUrl> {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) {
      formData.append('caption', caption);
    }
    return request(`/service-photo/${serviceRecordId}`, {
      method: 'POST',
      body: formData,
    });
  },

  findByServiceRecord(serviceRecordId: string): Promise<ServicePhotoWithUrl[]> {
    return request(`/service-photo/${serviceRecordId}`);
  },

  remove(id: string): Promise<void> {
    return request(`/service-photo/${id}`, {
      method: 'DELETE',
    });
  },
};

// ===== Users (Admin) =====

export const usersApi = {
  findAll(): Promise<UserResponse[]> {
    return request('/users/');
  },
};

export { ApiClientError, NetworkError };
