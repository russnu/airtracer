import { describe, expect, it } from 'vitest';
import { getReturnPath } from './navigation';

describe('getReturnPath', () => {
  it('returns a path string from state', () => {
    expect(getReturnPath({ from: '/qr/ATR_abc' })).toBe('/qr/ATR_abc');
  });

  it('rebuilds a location object, keeping search and hash', () => {
    expect(
      getReturnPath({
        from: { pathname: '/equipment/1/service-records/new', search: '?retry=x', hash: '#top' },
      }),
    ).toBe('/equipment/1/service-records/new?retry=x#top');
  });

  it('falls back when there is no state', () => {
    expect(getReturnPath(null)).toBe('/dashboard');
    expect(getReturnPath(undefined)).toBe('/dashboard');
    expect(getReturnPath({})).toBe('/dashboard');
    expect(getReturnPath({ from: 42 })).toBe('/dashboard');
  });

  it('rejects paths that leave the app', () => {
    expect(getReturnPath({ from: '//evil.com' })).toBe('/dashboard');
    expect(getReturnPath({ from: '/\\evil.com' })).toBe('/dashboard');
    expect(getReturnPath({ from: 'https://evil.com' })).toBe('/dashboard');
    expect(getReturnPath({ from: { pathname: '//evil.com' } })).toBe('/dashboard');
  });

  it('does not return to the auth pages', () => {
    expect(getReturnPath({ from: '/login' })).toBe('/dashboard');
    expect(getReturnPath({ from: '/register?x=1' })).toBe('/dashboard');
  });

  it('uses the given fallback', () => {
    expect(getReturnPath(null, '/scan')).toBe('/scan');
  });
});
