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

**Audit.** The `SERVICE_RECORD_CREATED` audit entry includes `clientRequestId` and `clientCapturedAt` (null when not sent). Audit entries for one asset are written under a per-asset database lock, so the hash chain stays linear under concurrent writes.

## Service photos

Upload limits: one file per request, at most **10 MB**, and the file content must be JPEG, PNG, or WebP. The declared content type must match the detected one.

| Method and path | Who may call it | Responses |
|---|---|---|
| `POST /service-photo/:serviceRecordId` (multipart `file`, optional `caption`) | `TECHNICIAN` who created the service record | 201; 400 missing or disallowed file; 403 other users; 404 record not found; 413 file too large |
| `GET /service-photo/:serviceRecordId` | The asset owner or the technician who created the record | 200 list with signed URLs (valid 1 hour); 403 other users; 404 record not found |
| `PATCH /service-photo/:id` (`caption`) | `TECHNICIAN` who created the service record | 200; 403; 404 |
| `DELETE /service-photo/:id` | `TECHNICIAN` who created the service record | 200; 403; 404 |

Owners cannot delete photos; photos are evidence attached by the technician.

## Public passport

### `GET /qr/:token` (public)

Returns `{ asset, serviceHistory }` with only the approved public fields. Photo URLs in `serviceHistory[].photos` are signed and expire after one hour.

| Status | When |
|---|---|
| 200 | Token is active |
| 404 | Token not found (including a token replaced by regeneration) |
| 409 | Token is inactive |

The PWA treats 404 and 409 as "QR code revoked" and deletes any offline copy saved under that token.
