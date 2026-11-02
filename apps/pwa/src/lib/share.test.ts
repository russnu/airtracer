import { describe, expect, it, vi } from 'vitest';
import { canShareLink, copyText, shareLink } from './share';

const url = 'https://airtracer.app/qr/ATR_abc';

describe('copyText', () => {
  it('writes the text and resolves true', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(copyText(url, { writeText })).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith(url);
  });

  it('resolves false when the clipboard API is missing (insecure context)', async () => {
    await expect(copyText(url, undefined)).resolves.toBe(false);
  });

  it('resolves false when the browser rejects the write', async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    await expect(copyText(url, { writeText })).resolves.toBe(false);
  });
});

describe('canShareLink', () => {
  it('is false without navigator.share', () => {
    expect(canShareLink(url, {})).toBe(false);
  });

  it('uses canShare when the browser provides it', () => {
    const share = vi.fn();
    expect(canShareLink(url, { share, canShare: () => false })).toBe(false);
    expect(canShareLink(url, { share, canShare: () => true })).toBe(true);
  });

  it('is true when only share exists', () => {
    expect(canShareLink(url, { share: vi.fn() })).toBe(true);
  });
});

describe('shareLink', () => {
  const data = { url, title: 'Daikin FTKF35' };

  it('reports a completed share', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    await expect(shareLink(data, { share })).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith(data);
  });

  it('treats closing the share sheet as cancelled', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('closed', 'AbortError'));
    await expect(shareLink(data, { share })).resolves.toBe('cancelled');
  });

  it('reports other errors as failed', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('no', 'NotAllowedError'));
    await expect(shareLink(data, { share })).resolves.toBe('failed');
  });

  it('fails without navigator.share', async () => {
    await expect(shareLink(data, {})).resolves.toBe('failed');
  });
});
