import { describe, expect, it } from 'vitest';
import { missingRole, navItemsFor } from './navItems';

const paths = (roles: string[]) => navItemsFor(roles).map((item) => item.path);

describe('navItemsFor', () => {
  it('shows owner pages to owners', () => {
    expect(paths(['OWNER'])).toEqual(['/dashboard', '/equipment', '/scan']);
  });

  it('shows technician pages to technicians', () => {
    expect(paths(['TECHNICIAN'])).toEqual([
      '/dashboard',
      '/scan',
      '/service-records',
      '/sync',
    ]);
  });

  it('combines both roles without duplicates', () => {
    expect(paths(['TECHNICIAN', 'OWNER'])).toEqual([
      '/dashboard',
      '/equipment',
      '/scan',
      '/service-records',
      '/sync',
    ]);
  });

  it('shows nothing to users without a known role', () => {
    expect(paths([])).toEqual([]);
    expect(paths(['UNKNOWN'])).toEqual([]);
  });
});

describe('missingRole', () => {
  it('offers the role the user does not hold', () => {
    expect(missingRole(['OWNER'])).toBe('TECHNICIAN');
    expect(missingRole(['TECHNICIAN'])).toBe('OWNER');
  });

  it('offers nothing once both are held', () => {
    expect(missingRole(['OWNER', 'TECHNICIAN'])).toBeNull();
  });
});
