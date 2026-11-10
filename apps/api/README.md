# AirTracer API

The REST API for AirTracer. It handles accounts, equipment, QR codes, service records and photo uploads, and stores data in PostgreSQL and photos in Supabase Storage. The deployed API is hosted on Render.

For an overview of the project, see the [root README](../../README.md).

## Stack

NestJS 11, TypeScript 5.9, Prisma 7 (with `@prisma/adapter-pg`), PostgreSQL, JWT authentication (Passport), Argon2 password hashing, and Supabase Storage.

## Environment variables

Copy `.env.example` to `.env` for development. For the end-to-end tests, copy `.env.test.example` to `.env.test`. That file must point to a separate local test database.

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | Port the API listens on (default `3000`) |
| `JWT_SECRET` | Secret used to sign access tokens. Use a long random value in production. |
| `JWT_EXPIRES_IN` | How long an access token stays valid, for example `7d` |
| `QR_BASE_URL` | PWA origin used in passport links (`<QR_BASE_URL>/qr/<token>`). These links are printed on QR labels, so in production use the long-term public PWA domain. |
| `CORS_ORIGINS` | Comma-separated PWA origins allowed to call the API, for example `http://localhost:5173` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Supabase secret (service role) key. Server-only: never put it in the PWA. |

The API will not start if any variable except `PORT` is missing.

## Supabase storage

1. In your Supabase project, open **Storage** and create a bucket named `service-photos`.
2. Leave the bucket **private**. The API gives out photo links that expire after one hour.
3. Copy the project URL and the secret (service role) key from the project settings into `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.

## Database

The Prisma client is generated into `generated/prisma` and is not committed. Generate it after installing dependencies and after every schema change:

```bash
pnpm --filter api db:generate
```

Apply the migrations to the database in `.env`:

```bash
pnpm --filter api db:migrate
```

| Script | Database | What it does |
|---|---|---|
| `db:generate` | none | Generates the Prisma client |
| `db:migrate` | `.env` | Applies pending migrations |
| `db:status` | `.env` | Shows which migrations are applied |
| `db:studio` | `.env` | Opens Prisma Studio |
| `db:migration:new` | `.env.test` | Creates a new migration from schema changes, without applying it |
| `test:db:migrate` | `.env.test` | Applies migrations to the test database |
| `test:db:status`, `test:db:studio` | `.env.test` | Same as above, for the test database |

## Seeding

The seed creates the roles, two demo users, and sample equipment with service records, so the app has data to show.

> **Warning:** seeding deletes **all** equipment, QR codes, service records, photos and audit logs in the target database before adding the sample data. Existing users are kept.

Preview what it will do, then run it:

```bash
pnpm --filter api db:seed:dry
```

```bash
pnpm --filter api db:seed
```

`test:db:seed` and `test:db:seed:dry` do the same for the test database. They refuse to run on a database that is not on `localhost`. Photo files that are no longer used after a seed are listed in `prisma/seeds/.orphaned-storage-keys.txt`, so you can delete them from the bucket.

## Running

| Command | What it does |
|---|---|
| `pnpm --filter api dev` | Starts the API in watch mode on `PORT` |
| `pnpm --filter api build` | Compiles to `dist/` |
| `pnpm --filter api start:prod` | Runs the compiled build |
| `pnpm --filter api lint` | Lints and fixes `src/` and `test/` |

## Testing

Unit tests need no database:

```bash
pnpm --filter api test
```

```bash
pnpm --filter api test:cov
```

End-to-end tests run against the database in `.env.test`. Create a local PostgreSQL database (for example `airtracer_test`), set it in `.env.test`, then apply the migrations and run the tests:

```bash
pnpm --filter api test:db:migrate
```

```bash
pnpm --filter api test:e2e
```

The Supabase placeholders in `.env.test.example` are enough, because the tests never write to storage.

## Authentication and roles

Every endpoint requires an `Authorization: Bearer <token>` header, except register, login and the public passport. Login and register return the token.

The roles are `OWNER` and `TECHNICIAN`. An account can hold both: a user picks one at registration and can add the other later. Roles cannot be removed. The API checks roles and resource ownership on every request, so it never relies on the PWA hiding buttons.

## Endpoints

| Area | Endpoints | Who can call them |
|---|---|---|
| Auth | `POST /auth/register`, `POST /auth/login` | Anyone |
| | `GET /auth/me`, `POST /auth/me/roles` | Any signed-in user |
| Equipment | `GET`, `POST /assets`; `GET`, `PATCH`, `DELETE /assets/:id`; `PATCH /assets/:id/deactivate` | Owner (own equipment only) |
| QR codes | `POST /qr/assets/:assetId`, `POST /qr/assets/:assetId/regenerate`, `PATCH /qr/:token/activate`, `PATCH /qr/:token/deactivate` | Owner of the equipment |
| Public passport | `GET /qr/:token` | Anyone (approved public fields only) |
| Service records | `POST /assets/:assetId/service-records`, `GET /service-records/mine`, `PATCH /service-records/:id/void` | Technician (voiding: the record's technician only) |
| | `GET /service-records/:id`, `GET /assets/:assetId/service-records` | Owner or technician |
| Service photos | `POST`, `GET /service-photo/:serviceRecordId` | Owner or technician (uploads: equipment owner or the record's technician) |
| | `PATCH`, `DELETE /service-photo/:id` | The record's technician |

Photo uploads accept one JPEG, PNG or WebP file of up to 10 MB per request. The file type is checked from its content.

For request bodies, responses and status codes, see the [API contract](../docs/api-contract.md).

## Deployment (Render)

The deployed API runs as a Render web service from this repository.

| Setting | Value |
|---|---|
| Build command | `pnpm install && pnpm --filter api db:generate && pnpm --filter api build` |
| Start command | `pnpm --filter api start:prod` |
| Environment | All variables from the table above. Set `CORS_ORIGINS` to the PWA origin (for example `https://airtracer-pwa-dev.vercel.app`) and `QR_BASE_URL` to the PWA's public domain. |

On Render the variables come from the service settings, not from a `.env` file. Apply new migrations with `pnpm --filter api db:migrate` before or during a deploy.

## Related documentation

- [Root README](../../README.md)
- [PWA README](../pwa/README.md)
- [API contract](../docs/api-contract.md)
- [Product requirements](../docs/PRD.md)
