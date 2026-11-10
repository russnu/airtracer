# AirTracer PWA

The web app for AirTracer. Owners and technicians use it in the browser, or install it as an app on phones and desktops. It talks only to the [AirTracer API](../api/README.md). The development deployment is at [airtracer-pwa-dev.vercel.app](https://airtracer-pwa-dev.vercel.app).

For an overview of the project, see the [root README](../../README.md).

## Stack

React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, TanStack Query 5, `vite-plugin-pwa` (Workbox), jsQR for QR scanning, `qrcode.react` for QR images, and Vitest for tests.

## Configuration

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the API. Defaults to `/api`. |

In development, leave `VITE_API_URL` unset. Vite then forwards `/api` requests to the API at `http://localhost:3000`. In a deployment, set it to the API's public URL. To override it locally, copy `.env.example` to `.env`.

Every `VITE_` variable is bundled into the app and visible to anyone who opens it. Never put secrets in them.

## Scripts

| Command | What it does |
|---|---|
| `pnpm --filter pwa dev` | Starts the dev server at http://localhost:5173 |
| `pnpm --filter pwa build` | Type-checks and builds to `dist/` |
| `pnpm --filter pwa preview` | Serves the production build locally |
| `pnpm --filter pwa lint` | Runs ESLint |
| `pnpm --filter pwa test` | Runs the unit tests |

## Pages

| Path | Who can open it | Purpose |
|---|---|---|
| `/login`, `/register` | Anyone | Sign in or create an account |
| `/qr/:token` | Anyone | Public equipment passport (the QR code destination) |
| `/dashboard` | Signed-in users | Owner or technician dashboard. Users with both roles can switch between them. |
| `/scan` | Signed-in users | Scan a QR code with the camera, upload a photo of one, or enter it by hand |
| `/equipment`, `/equipment/new`, `/equipment/:id`, `/equipment/:id/edit` | Owners | List, register, view and edit equipment, and manage its QR code |
| `/equipment/:id/label` | Owners | Printable QR label |
| `/equipment/:assetId/service-records/new` | Technicians | Record a service visit, online or offline |
| `/service-records` | Technicians | The technician's own service records |
| `/service-records/:id` | Owners and technicians | Service record details and photos |
| `/sync` | Technicians | Service records waiting to upload |

The API enforces all access rules. The PWA only hides pages a user's role cannot use.

## PWA behaviour

- AirTracer can be installed from the browser, and the app shows an **Install app** button where the browser supports it.
- The service worker is registered only in production builds (`build` and `preview`), not in `dev`.
- It caches the app's own files and web fonts. It never caches API responses, because they contain private data.
- When a new version is available, the app asks before updating, so open forms are not lost.

## Offline support

AirTracer supports two offline workflows (see [PRD §8.3](../docs/PRD.md#83-offline-behavior)):

- **Saved passports.** Signed-in users can save a passport from its page and open it offline. Saved copies contain text only. Photos need a connection.
- **Offline service records.** Technicians can create service records without a connection. Records are saved on the device first and upload automatically when the connection returns. Pending records are listed at `/sync`.

Everything else, including photo uploads, voiding records and owner actions, needs a connection. Offline data is stored in IndexedDB. The code is in `src/lib/offline/`.

### Testing offline behaviour manually

```bash
pnpm --filter pwa build
```

```bash
pnpm --filter pwa preview
```

Then, in the browser's developer tools:

1. **Application → Service workers:** check that the worker is active. **Cache storage** should contain only app files and fonts, never API responses.
2. **Network → Offline:** reload. You should stay signed in, and an offline banner should appear.
3. Open a saved passport while offline. The saved copy is shown with the time it was last updated.
4. Create a service record while offline. It appears on `/sync`. Go back online: it uploads once and leaves the pending list.
5. **Application → IndexedDB → airtracer:** inspect the `savedPassports`, `outbox` and `meta` stores.

## Testing

```bash
pnpm --filter pwa test
```

This runs every unit test in `src/**/*.test.ts` in Node, with an in-memory IndexedDB. The tests cover the offline data layer and sync, navigation and route access, sharing, QR labels, equipment types, service outcomes and the install prompt.

## Deployment (Vercel)

The development deployment, [airtracer-pwa-dev.vercel.app](https://airtracer-pwa-dev.vercel.app), is hosted on Vercel and talks to the API on Render. The Vercel project builds `apps/pwa` with `pnpm build`, serves `dist/`, and sets `VITE_API_URL` to the Render API URL.

`vercel.json` sends every path to `index.html`, so links such as `/qr/<token>` open directly. The API must list the PWA's origin in `CORS_ORIGINS`, and its `QR_BASE_URL` should match the PWA's public domain. See the [API README](../api/README.md#environment-variables).

## Related documentation

- [Root README](../../README.md)
- [API README](../api/README.md)
- [API contract](../docs/api-contract.md)
- [Product requirements](../docs/PRD.md)
