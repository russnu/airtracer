import { randomBytes } from 'crypto';

const TOKEN_PREFIX = 'ATR';

export function generateQrToken(): string {
  const random = randomBytes(32).toString('base64url');

  return `${TOKEN_PREFIX}_${random}`;
}

// The passport URL encoded in QR codes and shared links. It ends up on
// printed labels, so it must always come from the configured QR_BASE_URL.
export function buildPassportUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/qr/${token}`;
}
