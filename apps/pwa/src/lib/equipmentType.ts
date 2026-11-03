import type { EquipmentType } from '../types/api';

// Mirrors the EquipmentType enum in the API's Prisma schema, in display order.
// A new type needs a migration there and a label here.
export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  WINDOW_TYPE: 'Window-Type',
  WALL_MOUNTED_SPLIT: 'Wall-Mounted Split-Type',
  FLOOR_MOUNTED_SPLIT: 'Floor-Mounted Split-Type',
  CEILING_CASSETTE: 'Ceiling Cassette',
  CEILING_SUSPENDED: 'Ceiling Suspended',
  DUCTED_SPLIT: 'Ducted Split-Type',
  PORTABLE: 'Portable',
  PACKAGE_TYPE: 'Package-Type',
};

export const EQUIPMENT_TYPE_OPTIONS = (
  Object.entries(EQUIPMENT_TYPE_LABELS) as [EquipmentType, string][]
).map(([value, label]) => ({ value, label }));

/**
 * The label for a type. Unknown values are shown as they are: passports saved
 * offline before the enum already hold the label text.
 */
export function equipmentTypeLabel(value: string): string {
  return value in EQUIPMENT_TYPE_LABELS
    ? EQUIPMENT_TYPE_LABELS[value as EquipmentType]
    : value;
}
