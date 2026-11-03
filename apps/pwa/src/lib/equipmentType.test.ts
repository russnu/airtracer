import { describe, expect, it } from 'vitest';
import { EQUIPMENT_TYPE_OPTIONS, equipmentTypeLabel } from './equipmentType';

describe('equipmentTypeLabel', () => {
  it('labels enum values', () => {
    expect(equipmentTypeLabel('WALL_MOUNTED_SPLIT')).toBe('Wall-Mounted Split-Type');
    expect(equipmentTypeLabel('PORTABLE')).toBe('Portable');
  });

  it('shows labels saved before the enum unchanged', () => {
    expect(equipmentTypeLabel('Wall-Mounted Split-Type')).toBe('Wall-Mounted Split-Type');
  });
});

describe('EQUIPMENT_TYPE_OPTIONS', () => {
  it('lists all eight types in display order', () => {
    expect(EQUIPMENT_TYPE_OPTIONS).toHaveLength(8);
    expect(EQUIPMENT_TYPE_OPTIONS[0]).toEqual({ value: 'WINDOW_TYPE', label: 'Window-Type' });
  });
});
