/** Pages a user should never be sent back to after signing in. */
const AUTH_PATHS = ['/login', '/register'];

/**
 * Reads the in-app path a user was sent away from (`state.from`, set when
 * redirecting to /login) and returns it if it is safe to navigate to.
 * Accepts a path string or a location-like `{ pathname, search, hash }`.
 * Anything else, including other origins and the auth pages themselves,
 * returns the fallback.
 */
export function getReturnPath(state: unknown, fallback = '/dashboard'): string {
  if (typeof state !== 'object' || state === null || !('from' in state)) {
    return fallback;
  }

  const from = (state as { from: unknown }).from;
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
    return fallback;
  }

  const pathname = path.split(/[?#]/)[0];
  if (AUTH_PATHS.includes(pathname)) {
    return fallback;
  }

  return path;
}

/** A root-relative path; `//host` and `/\host` would leave the app. */
function isSameOriginPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\');
}
