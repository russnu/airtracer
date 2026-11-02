import { buildPassportUrl } from './qr.util';

describe('buildPassportUrl', () => {
  it('should append the passport path to the base URL', () => {
    expect(buildPassportUrl('https://airtracer.app', 'ATR_abc')).toBe(
      'https://airtracer.app/qr/ATR_abc',
    );
  });

  it('should not double the slash when the base URL ends with one', () => {
    expect(buildPassportUrl('https://airtracer.app/', 'ATR_abc')).toBe(
      'https://airtracer.app/qr/ATR_abc',
    );
  });
});
