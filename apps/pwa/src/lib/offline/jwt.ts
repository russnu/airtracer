export interface TokenClaims {
  sub: string;
  exp?: number;
}

/**
 * Reads the JWT payload without verifying it. Used only to decide what the UI
 * shows while offline; the API verifies the token on every request.
 */
export function readTokenClaims(token: string): TokenClaims | null {
  const payload = token.split('.')[1];
  if (!payload) {
    return null;
  }

  try {
    const base64 = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const claims: unknown = JSON.parse(atob(base64));

    if (typeof claims !== 'object' || claims === null) {
      return null;
    }

    const { sub, exp } = claims as { sub?: unknown; exp?: unknown };
    if (typeof sub !== 'string') {
      return null;
    }

    return { sub, exp: typeof exp === 'number' ? exp : undefined };
  } catch {
    return null;
  }
}

export function isTokenExpired(claims: TokenClaims, now = Date.now()): boolean {
  return claims.exp !== undefined && claims.exp * 1000 <= now;
}
