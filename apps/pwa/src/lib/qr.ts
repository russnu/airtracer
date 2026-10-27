/**
 * Parses an AirTracer QR token from decoded QR text or manual input.
 * Accepts raw tokens (e.g. ATR_xxxx) or URLs containing /qr/ATR_xxxx.
 * Returns the extracted token string or null if not a valid AirTracer token.
 */
export function parseQrToken(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Match ATR_ followed by url-safe characters
  const match = trimmed.match(/ATR_[A-Za-z0-9_-]+/);
  if (match) {
    return match[0];
  }

  return null;
}
