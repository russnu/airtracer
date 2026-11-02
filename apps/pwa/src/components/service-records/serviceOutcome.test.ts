import { describe, expect, it } from 'vitest';
import { serviceRecordState } from './serviceOutcome';

describe('serviceRecordState', () => {
  it('returns the outcome of a record that is not voided', () => {
    expect(serviceRecordState({ outcome: 'FOLLOW_UP_NEEDED', voidedAt: null })).toBe(
      'FOLLOW_UP_NEEDED',
    );
  });

  it('shows a voided record as voided, whatever its outcome', () => {
    expect(
      serviceRecordState({
        outcome: 'RESOLVED',
        voidedAt: '2026-10-02T00:00:00.000Z',
      }),
    ).toBe('VOIDED');
  });

  it('treats a missing or null outcome as not recorded', () => {
    expect(serviceRecordState({ outcome: null, voidedAt: null })).toBe('NOT_RECORDED');
    expect(serviceRecordState({})).toBe('NOT_RECORDED');
  });
});
