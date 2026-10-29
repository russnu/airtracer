import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { ApiClientError, NetworkError, qrApi } from '../api-client';
import type { PublicPassportResponse } from '../../types/api';
import {
  getSavedPassportByToken,
  listSavedPassports,
  loadPassport,
  PassportUnavailableError,
  refreshSavedPassports,
  removeSavedPassportsNotOwnedBy,
  savePassport,
} from './passports';

function passport(assetId = 'asset-1', photoCount = 2): PublicPassportResponse {
  return {
    asset: {
      id: assetId,
      brand: 'Daikin',
      model: 'FTKF35',
      serialNumber: null,
      equipmentType: 'Split',
      installationDate: null,
      location: 'Room 101',
    },
    serviceHistory: [
      {
        id: 'record-1',
        serviceDate: '2026-10-01T00:00:00.000Z',
        serviceType: 'Inspection',
        description: null,
        measurements: {
          suctionPressure: 70,
          dischargePressure: null,
          current: null,
          voltage: null,
          returnAirTemp: null,
          supplyAirTemp: null,
        },
        findings: null,
        recommendations: null,
        technician: { name: 'Sam Tech' },
        photos: Array.from({ length: photoCount }, (_, index) => ({
          id: `photo-${index}`,
          url: `https://signed.example/${index}`,
        })),
      },
    ],
  };
}

describe('saved passports', () => {
  let getPublicPassport: MockInstance<typeof qrApi.getPublicPassport>;

  beforeEach(() => {
    getPublicPassport = vi.spyOn(qrApi, 'getPublicPassport');
  });

  it('stores text only, keeping a photo count instead of signed URLs', async () => {
    const saved = await savePassport('ATR_1', passport(), 'user-1');

    expect(saved.serviceHistory[0]).not.toHaveProperty('photos');
    expect(saved.serviceHistory[0].photoCount).toBe(2);
  });

  it('is visible only to the user who saved it', async () => {
    await savePassport('ATR_1', passport(), 'user-1');

    expect(await getSavedPassportByToken('ATR_1', 'user-1')).not.toBeNull();
    expect(await getSavedPassportByToken('ATR_1', 'user-2')).toBeNull();
  });

  it('replaces the copy when the same asset is saved under a new token', async () => {
    await savePassport('ATR_old', passport(), 'user-1');
    await savePassport('ATR_new', passport(), 'user-1');

    const saved = await listSavedPassports('user-1');
    expect(saved).toHaveLength(1);
    expect(saved[0].token).toBe('ATR_new');
  });

  it('removes copies saved by other accounts on sign-in', async () => {
    await savePassport('ATR_1', passport('asset-1'), 'user-1');
    await savePassport('ATR_2', passport('asset-2'), 'user-2');

    await removeSavedPassportsNotOwnedBy('user-2');

    expect(await listSavedPassports('user-1')).toEqual([]);
    expect(await listSavedPassports('user-2')).toHaveLength(1);
  });

  describe('loadPassport', () => {
    it('falls back to the saved copy when the API is unreachable', async () => {
      await savePassport('ATR_1', passport(), 'user-1');
      getPublicPassport.mockRejectedValue(new NetworkError(new TypeError('offline')));

      const view = await loadPassport('ATR_1', 'user-1');

      expect(view.source).toBe('saved');
      expect(view.data.serviceHistory[0].photos).toEqual([]);
      expect(view.photoCounts).toEqual({ 'record-1': 2 });
    });

    it('does not fall back for a signed-out visitor', async () => {
      await savePassport('ATR_1', passport(), 'user-1');
      getPublicPassport.mockRejectedValue(new NetworkError(new TypeError('offline')));

      await expect(loadPassport('ATR_1', null)).rejects.toBeInstanceOf(NetworkError);
    });

    it('deletes the saved copy when the QR code is revoked', async () => {
      await savePassport('ATR_1', passport(), 'user-1');
      getPublicPassport.mockRejectedValue(new ApiClientError(409, 'QR code is inactive'));

      const error = await loadPassport('ATR_1', 'user-1').catch((err: unknown) => err);

      expect(error).toBeInstanceOf(PassportUnavailableError);
      expect((error as PassportUnavailableError).removedOfflineCopy).toBe(true);
      expect(await listSavedPassports('user-1')).toEqual([]);
    });

    it('updates the saved copy after a successful fetch', async () => {
      await savePassport('ATR_1', passport('asset-1', 0), 'user-1');
      getPublicPassport.mockResolvedValue(passport('asset-1', 3));

      const view = await loadPassport('ATR_1', 'user-1');

      expect(view.source).toBe('network');
      expect(view.saved?.serviceHistory[0].photoCount).toBe(3);
    });
  });

  describe('refreshSavedPassports', () => {
    it('updates live copies, deletes revoked ones, and keeps unreachable ones', async () => {
      await savePassport('ATR_live', passport('asset-live'), 'user-1');
      await savePassport('ATR_gone', passport('asset-gone'), 'user-1');
      await savePassport('ATR_down', passport('asset-down'), 'user-1');

      getPublicPassport.mockImplementation(async (token: string) => {
        if (token === 'ATR_gone') throw new ApiClientError(404, 'QR code not found');
        if (token === 'ATR_down') throw new NetworkError(new TypeError('offline'));
        return passport('asset-live');
      });

      const result = await refreshSavedPassports('user-1');

      expect(result.refreshed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.removed.map((saved) => saved.token)).toEqual(['ATR_gone']);
      expect((await listSavedPassports('user-1')).map((s) => s.token).sort()).toEqual([
        'ATR_down',
        'ATR_live',
      ]);
    });
  });
});
