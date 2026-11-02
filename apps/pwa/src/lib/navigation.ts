import { canAccess, HOME_PATH, isPublicPath } from './routeAccess';

/** Pages a user should never be sent back to after signing in. */
const AUTH_PATHS = ['/login', '/register'];

/**
 * State passed to /login. `from` is the page to return to. `userId` is set when
 * a session expired, so only that account returns there. `fallbackFrom` is
 * tried when `from` is not allowed for the account that signs in.
 */
export interface ReturnState {
  from: unknown;
  userId?: string;
  fallbackFrom?: string;
}

/**
 * Picks the page to open after signing in. A saved page is used only when
 * it is safe, the user's role may open it, and, if it was saved when another
 * account's session expired, it is public. Otherwise the user goes home.
 */
export function resolvePostLoginPath(
  state: unknown,
  user: { id: string; roles: readonly string[] },
): string {
  if (typeof state !== 'object' || state === null) {
    return HOME_PATH;
  }

  const { from, userId, fallbackFrom } = state as Partial<ReturnState>;
  const savedForOtherUser = typeof userId === 'string' && userId !== user.id;

  for (const candidate of [from, fallbackFrom]) {
    const path = toSafePath(candidate);
    if (!path) continue;

    const pathname = path.split(/[?#]/)[0];
    if (savedForOtherUser && !isPublicPath(pathname)) continue;
    if (canAccess(pathname, user.roles)) return path;
  }
  return HOME_PATH;
}

/**
 * Accepts a path string or a location-like `{ pathname, search, hash }` and
 * returns it as a path, or null if it leaves the app or is an auth page.
 */
function toSafePath(from: unknown): string | null {
  let path: string | null = null;
  if (typeof from === 'string') {
    path = from;
  } else if (typeof from === 'object' && from !== null && 'pathname' in from) {
    const { pathname, search, hash } = from as {
      pathname: unknown;
      search?: unknown;
      hash?: unknown;
    };
    if (typeof pathname === 'string') {
      path =
        pathname +
        (typeof search === 'string' ? search : '') +
        (typeof hash === 'string' ? hash : '');
    }
  }

  if (!path || !isSameOriginPath(path)) {
    return null;
  }

  const pathname = path.split(/[?#]/)[0];
  if (AUTH_PATHS.includes(pathname)) {
    return null;
  }

  return path;
}

/** A root-relative path; `//host` and `/\host` would leave the app. */
function isSameOriginPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\');
}
