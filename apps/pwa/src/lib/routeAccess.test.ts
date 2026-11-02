import { describe, expect, it } from 'vitest';
import { canAccess, isPublicPath } from './routeAccess';

describe('canAccess', () => {
  it('lets every signed-in role open the shared pages', () => {
    for (const roles of [['OWNER'], ['TECHNICIAN'], ['ADMIN']]) {
      expect(canAccess('/dashboard', roles)).toBe(true);
      expect(canAccess('/scan', roles)).toBe(true);
    }
  });

  it('keeps equipment management to owners', () => {
    for (const path of ['/equipment', '/equipment/new', '/equipment/a1', '/equipment/a1/edit']) {
      expect(canAccess(path, ['OWNER'])).toBe(true);
      expect(canAccess(path, ['TECHNICIAN'])).toBe(false);
      expect(canAccess(path, ['ADMIN'])).toBe(false);
    }
  });

  it('keeps service-record work to technicians', () => {
    for (const path of ['/service-records', '/sync', '/equipment/a1/service-records/new']) {
      expect(canAccess(path, ['TECHNICIAN'])).toBe(true);
      expect(canAccess(path, ['OWNER'])).toBe(false);
    }
  });

  it('lets owners and technicians view a service record', () => {
    expect(canAccess('/service-records/r1', ['OWNER'])).toBe(true);
    expect(canAccess('/service-records/r1', ['TECHNICIAN'])).toBe(true);
    expect(canAccess('/service-records/r1', ['ADMIN'])).toBe(false);
  });

  it('accepts any matching role', () => {
    expect(canAccess('/sync', ['OWNER', 'TECHNICIAN'])).toBe(true);
  });

  it('allows public pages for everyone', () => {
    expect(canAccess('/qr/ATR_abc', [])).toBe(true);
  });

  it('rejects unknown paths and users without roles', () => {
    expect(canAccess('/users', ['ADMIN'])).toBe(false);
    expect(canAccess('/equipment/a1/extra', ['OWNER'])).toBe(false);
    expect(canAccess('/equipment', [])).toBe(false);
  });
});

describe('isPublicPath', () => {
  it('recognises passports only', () => {
    expect(isPublicPath('/qr/ATR_abc')).toBe(true);
    expect(isPublicPath('/qr')).toBe(false);
    expect(isPublicPath('/dashboard')).toBe(false);
  });
});
