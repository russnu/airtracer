import { describe, expect, it } from 'vitest';
import { LABEL_SIZES, labelDimensions, labelFileName, mmToPixels } from './qrLabel';

describe('labelDimensions', () => {
  it('fits the QR code, padding, and three text lines', () => {
    const [small, medium] = LABEL_SIZES;
    expect(labelDimensions(small)).toEqual({ widthMm: 31, heightMm: 39.4 });
    expect(labelDimensions(medium)).toEqual({ widthMm: 46, heightMm: 56.7 });
  });
});

describe('mmToPixels', () => {
  it('converts millimetres at the given resolution', () => {
    expect(mmToPixels(25.4, 300)).toBe(300);
    expect(mmToPixels(40, 300)).toBe(472);
  });
});

describe('labelFileName', () => {
  it('builds a safe, descriptive file name', () => {
    expect(labelFileName('Daikin', 'FTKF35 / Inverter', 40, 'svg')).toBe(
      'airtracer-qr-daikin-ftkf35-inverter-40mm.svg',
    );
  });

  it('falls back when brand and model have no usable characters', () => {
    expect(labelFileName('—', '', 25, 'png')).toBe('airtracer-qr-equipment-25mm.png');
  });
});
