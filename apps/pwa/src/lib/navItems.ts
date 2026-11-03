import type { RoleName } from '../types/api';

export interface NavItem {
  name: string;
  path: string;
}

// In display order. A user with both roles sees every item once.
const NAV_ITEMS: (NavItem & { roles: readonly RoleName[] })[] = [
  { name: 'Dashboard', path: '/dashboard', roles: ['OWNER', 'TECHNICIAN'] },
  { name: 'My Equipments', path: '/equipment', roles: ['OWNER'] },
  { name: 'Scan QR', path: '/scan', roles: ['OWNER', 'TECHNICIAN'] },
  { name: 'Service Records', path: '/service-records', roles: ['TECHNICIAN'] },
  { name: 'Pending sync', path: '/sync', roles: ['TECHNICIAN'] },
];

export function navItemsFor(roles: readonly string[]): NavItem[] {
  return NAV_ITEMS.filter((item) =>
    item.roles.some((role) => roles.includes(role)),
  ).map(({ name, path }) => ({ name, path }));
}

export const ROLE_LABELS: Record<RoleName, string> = {
  OWNER: 'Owner',
  TECHNICIAN: 'Technician',
};

/** The role a signed-in user could still add, or null if they hold both. */
export function missingRole(roles: readonly string[]): RoleName | null {
  if (!roles.includes('OWNER')) return 'OWNER';
  if (!roles.includes('TECHNICIAN')) return 'TECHNICIAN';
  return null;
}
