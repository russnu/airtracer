import { matchPath } from 'react-router-dom';

/** Where a signed-in user starts, whatever their role. */
export const HOME_PATH = '/dashboard';

/** Pages anyone can open, signed in or not. */
const PUBLIC_PATHS = ['/qr/:token'];

/**
 * Roles allowed on each protected page, mirroring the backend's @Roles rules
 * for the endpoints the page calls. `null` means any signed-in user. The
 * backend stays authoritative; this only keeps users off pages that would
 * fail for their role.
 */
const PROTECTED_PATHS: { path: string; roles: readonly string[] | null }[] = [
  { path: '/dashboard', roles: null },
  { path: '/scan', roles: null },
  { path: '/equipment', roles: ['OWNER'] },
  { path: '/equipment/new', roles: ['OWNER'] },
  { path: '/equipment/:id', roles: ['OWNER'] },
  { path: '/equipment/:id/edit', roles: ['OWNER'] },
  { path: '/equipment/:assetId/service-records/new', roles: ['TECHNICIAN'] },
  { path: '/service-records', roles: ['TECHNICIAN'] },
  { path: '/service-records/:id', roles: ['OWNER', 'TECHNICIAN'] },
  { path: '/sync', roles: ['TECHNICIAN'] },
];

function matches(pattern: string, pathname: string): boolean {
  return matchPath({ path: pattern, end: true }, pathname) !== null;
}

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((pattern) => matches(pattern, pathname));
}

/**
 * Whether a user with these roles may open the page. Unknown paths return
 * false so they are never used as a return path.
 */
export function canAccess(pathname: string, roles: readonly string[]): boolean {
  if (isPublicPath(pathname)) {
    return true;
  }
  const route = PROTECTED_PATHS.find(({ path }) => matches(path, pathname));
  if (!route) {
    return false;
  }
  return route.roles === null || route.roles.some((role) => roles.includes(role));
}
