import { describe, expect, it } from 'vitest';
import { isTokenExpired, readTokenClaims } from './jwt';

function token(payload: object): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.signature`;
}

describe('readTokenClaims', () => {
  it('reads sub and exp', () => {
    expect(readTokenClaims(token({ sub: 'user-1', exp: 1_900_000_000 }))).toEqual({
      sub: 'user-1',
      exp: 1_900_000_000,
    });
  });

  it('returns null for malformed tokens', () => {
    expect(readTokenClaims('not-a-jwt')).toBeNull();
    expect(readTokenClaims('a.%%%.c')).toBeNull();
    expect(readTokenClaims(token({ exp: 1 }))).toBeNull();
  });
});

describe('isTokenExpired', () => {
  it('compares exp (seconds) with the current time', () => {
    const now = Date.UTC(2026, 9, 29);
    expect(isTokenExpired({ sub: 'u', exp: now / 1000 - 1 }, now)).toBe(true);
    expect(isTokenExpired({ sub: 'u', exp: now / 1000 + 60 }, now)).toBe(false);
    expect(isTokenExpired({ sub: 'u' }, now)).toBe(false);
  });
});
