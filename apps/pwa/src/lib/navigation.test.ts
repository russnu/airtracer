import { describe, expect, it } from 'vitest';
import { resolvePostLoginPath } from './navigation';

const owner = { id: 'owner-1', roles: ['OWNER'] };
const technician = { id: 'tech-1', roles: ['TECHNICIAN'] };

describe('resolvePostLoginPath', () => {
  it('returns a path string from state', () => {
    expect(resolvePostLoginPath({ from: '/qr/ATR_abc' }, owner)).toBe('/qr/ATR_abc');
  });

  it('rebuilds a location object, keeping search and hash', () => {
    expect(
      resolvePostLoginPath(
        {
          from: { pathname: '/equipment/1/service-records/new', search: '?retry=x', hash: '#top' },
        },
        technician,
      ),
    ).toBe('/equipment/1/service-records/new?retry=x#top');
  });

  it('goes home when there is no saved page', () => {
    expect(resolvePostLoginPath(null, owner)).toBe('/dashboard');
    expect(resolvePostLoginPath(undefined, owner)).toBe('/dashboard');
    expect(resolvePostLoginPath({}, owner)).toBe('/dashboard');
    expect(resolvePostLoginPath({ from: 42 }, owner)).toBe('/dashboard');
  });

  it('rejects paths that leave the app', () => {
    expect(resolvePostLoginPath({ from: '//evil.com' }, owner)).toBe('/dashboard');
    expect(resolvePostLoginPath({ from: '/\\evil.com' }, owner)).toBe('/dashboard');
    expect(resolvePostLoginPath({ from: 'https://evil.com' }, owner)).toBe('/dashboard');
    expect(resolvePostLoginPath({ from: { pathname: '//evil.com' } }, owner)).toBe('/dashboard');
  });

  it('does not return to the auth pages', () => {
    expect(resolvePostLoginPath({ from: '/login' }, owner)).toBe('/dashboard');
    expect(resolvePostLoginPath({ from: '/register?x=1' }, owner)).toBe('/dashboard');
  });

  it('does not open a page the role cannot use', () => {
    expect(resolvePostLoginPath({ from: '/equipment/a1' }, technician)).toBe('/dashboard');
    expect(resolvePostLoginPath({ from: '/service-records' }, owner)).toBe('/dashboard');
    expect(resolvePostLoginPath({ from: '/users' }, owner)).toBe('/dashboard');
  });

  it('returns the same user to the page their session expired on', () => {
    const state = { from: '/equipment/a1', userId: owner.id };
    expect(resolvePostLoginPath(state, owner)).toBe('/equipment/a1');
  });

  it("sends another account home instead of to the previous user's page", () => {
    const state = { from: '/equipment/a1', userId: owner.id };
    expect(resolvePostLoginPath(state, { id: 'owner-2', roles: ['OWNER'] })).toBe('/dashboard');
  });

  it("keeps a public page even after another account's session expired", () => {
    const state = { from: '/qr/ATR_abc', userId: owner.id };
    expect(resolvePostLoginPath(state, technician)).toBe('/qr/ATR_abc');
  });

  it('uses the fallback page when the role cannot open the saved one', () => {
    const state = { from: '/equipment/a1/service-records/new', fallbackFrom: '/qr/ATR_abc' };
    expect(resolvePostLoginPath(state, technician)).toBe('/equipment/a1/service-records/new');
    expect(resolvePostLoginPath(state, owner)).toBe('/qr/ATR_abc');
  });
});
