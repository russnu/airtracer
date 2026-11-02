# AirTracer — API Contract

Verified contracts for the endpoints below, taken from the NestJS controllers, DTOs, and services in `apps/api/src`. Endpoints not listed here have not been documented yet; read their controller and DTO before using them.

## Conventions

- All endpoints require `Authorization: Bearer <JWT>` unless marked public.
- Request bodies are validated by a global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`). A body with unknown fields or wrongly typed values is rejected with **400**, and `message` is an array of validation errors.
- Error responses use the NestJS shape: `{ statusCode, message, error? }`.
- A missing, invalid, or expired token returns **401**. A valid token without the required role returns **403**.

## Service records

### `POST /assets/:assetId/service-records`

Creates a service record for an asset. **Role:** `TECHNICIAN`. The technician is taken from the token, never from the body.

Body (`CreateServiceRecordDto`):

| Field | Type | Required | Notes |
|---|---|---|---|
| `serviceDate` | ISO 8601 string | yes | |
| `serviceType` | string | yes | non-empty |
| `description` | string | no | |
| `outcome` | `"RESOLVED"` \| `"FOLLOW_UP_NEEDED"` \| `"UNABLE_TO_COMPLETE"` | yes | The result of the visit. Cannot be changed later. |
| `suctionPressure`, `dischargePressure` | number | no | PSI |
| `current` | number | no | A |
| `voltage` | number | no | V |
| `returnAirTemp`, `supplyAirTemp` | number | no | °C |
| `findings`, `recommendations` | string | no | |
| `clientRequestId` | UUID v4 string | no | Idempotency key; see below |
| `clientCapturedAt` | ISO 8601 string | no | When the device captured the record. Stored in the audit log only, for information. |

Responses:

| Status | When |
|---|---|
| 201 | Created, or a replay of an earlier request with the same `clientRequestId` (the stored record is returned unchanged) |
| 400 | Validation failed, or the asset is inactive (new records only) |
| 403 | Caller is not a technician |
| 404 | Asset not found |
| 409 | `clientRequestId` was already used by a different technician or for a different asset |

**Idempotency.** When `clientRequestId` is present, it is checked before the asset is checked. A repeated request from the same technician for the same asset returns the record already stored, even if the asset has since been deactivated, because the record was accepted when first received. The key is unique in the database, so concurrent duplicates also resolve to one record. A replay returns the original record even if the body differs.

**Record fields.** Every service record response includes `outcome`, `voidedAt` (ISO 8601 or null) and `voidReason` (string or null). `outcome` is null only on records created before outcomes were recorded.

**Audit.** The `SERVICE_RECORD_CREATED` audit entry includes `outcome`, `clientRequestId` and `clientCapturedAt` (null when not sent). Audit entries for one asset are written under a per-asset database lock, so the hash chain stays linear under concurrent writes.

### Reading service records

Any owner or technician may read any service record. Only the record's technician may void it, and only the asset owner or the record's technician may add photos.

| Method and path | Who may call it | Responses |
|---|---|---|
| `GET /service-records/mine` | `TECHNICIAN` | 200 the caller's records, newest `serviceDate` first |
| `GET /service-records/:id` | `OWNER` or `TECHNICIAN` | 200; 404 record not found |
| `GET /assets/:assetId/service-records` | `OWNER` or `TECHNICIAN` | 200 records, newest `serviceDate` first; 404 asset not found |

`GET /service-records/:id` returns the record with `asset: { id, brand, model, serialNumber, location, ownerId }`. Each item from `GET /service-records/mine` has the same `asset` object plus `photoCount` (number). `GET /assets/:assetId/service-records` returns records without `asset`.

### `PATCH /service-records/:id/void`

Body: `{ "reason": string }` (required, non-empty, at most 500 characters). **Role:** `TECHNICIAN` who created the record. Online only.

Records are append-only, so voiding is the only change. It is one-way: a voided record stays in the history, labelled as voided, and is never restored. A wrong record is voided and a correct one created instead. Returns the record with `voidedAt` and `voidReason` set.

| Status | When |
|---|---|
| 200 | Voided |
| 400 | Validation failed |
| 403 | Caller is not the technician who created the record |
| 404 | Record not found |
| 409 | The record is already voided (including a concurrent void that finished first) |

Audit event: `SERVICE_RECORD_VOIDED` with `serviceRecordId` and `reason`.

The former `PATCH /service-records/:id/status` workflow has been removed. Existing audit entries for `SERVICE_RECORD_UPDATED`, `SERVICE_RECORD_COMPLETED` and `SERVICE_RECORD_CANCELLED` are kept, but these events are no longer written.

## Service photos

Upload limits: one file per request, at most **10 MB**, and the file content must be JPEG, PNG, or WebP. The declared content type must match the detected one.

| Method and path | Who may call it | Responses |
|---|---|---|
| `POST /service-photo/:serviceRecordId` (multipart `file`, optional `caption`) | The asset owner or the `TECHNICIAN` who created the service record | 201; 400 missing or disallowed file; 403 other users; 404 record not found; 413 file too large |
| `GET /service-photo/:serviceRecordId` | Any `OWNER` or `TECHNICIAN` | 200 list with signed URLs (valid 1 hour); 403 other roles; 404 record not found |
| `PATCH /service-photo/:id` (`caption`) | `TECHNICIAN` who created the service record | 200; 403; 404 |
| `DELETE /service-photo/:id` | `TECHNICIAN` who created the service record | 200; 403; 404 |

Owners can add photos but cannot edit or delete any photo; editing and deleting stay with the record's technician. Authorization is checked before the file, so a disallowed user gets 403 even for an invalid file. Photos cannot be added to a voided record (400).

## Public passport

### `GET /qr/:token` (public)

Returns `{ asset, serviceHistory }` with only the approved public fields. Photo URLs in `serviceHistory[].photos` are signed and expire after one hour.

Each `serviceHistory` item has `id`, `serviceDate`, `serviceType`, `description`, `outcome`, `voidedAt`, `voidReason`, `measurements`, `findings`, `recommendations`, `technician: { name } | null` and `photos`. Voided records are included and are identified by a non-null `voidedAt`.

| Status | When |
|---|---|
| 200 | Token is active |
| 404 | Token not found (including a token replaced by regeneration) |
| 409 | Token is inactive |

The PWA treats 404 and 409 as "QR code revoked" and deletes any offline copy saved under that token.
