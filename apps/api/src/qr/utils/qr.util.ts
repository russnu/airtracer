import { randomBytes } from 'crypto';

const TOKEN_PREFIX = 'ATR';

export function generateQrToken(): string {
  const random = randomBytes(32).toString('base64url');

  return `${TOKEN_PREFIX}_${random}`;
}
