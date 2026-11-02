/**
 * Adds a pHYs chunk to a PNG so label and photo software prints it at the
 * intended physical size. Canvas exports carry no resolution, which most
 * programs then read as 72 or 96 dpi.
 */

const PNG_SIGNATURE_LENGTH = 8;
// Length, type, 13 bytes of data, CRC.
const IHDR_CHUNK_LENGTH = 4 + 4 + 13 + 4;
const METRES_PER_INCH = 0.0254;

let crcTable: Uint32Array | null = null;

function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function hasChunk(png: Uint8Array, type: string): boolean {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let offset = PNG_SIGNATURE_LENGTH;
  while (offset + 8 <= png.length) {
    const length = view.getUint32(offset);
    const chunkType = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
    if (chunkType === type) {
      return true;
    }
    if (chunkType === 'IDAT') {
      return false;
    }
    offset += 12 + length;
  }
  return false;
}

/** Returns the PNG with its resolution set to `dpi`, left unchanged if already set. */
export function withPngDpi(png: Uint8Array, dpi: number): Uint8Array {
  if (hasChunk(png, 'pHYs')) {
    return png;
  }

  const pixelsPerMetre = Math.round(dpi / METRES_PER_INCH);
  const chunk = new Uint8Array(4 + 4 + 9 + 4);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  view.setUint32(8, pixelsPerMetre);
  view.setUint32(12, pixelsPerMetre);
  chunk[16] = 1; // Unit: metre.
  view.setUint32(17, crc32(chunk.subarray(4, 17)));

  const insertAt = PNG_SIGNATURE_LENGTH + IHDR_CHUNK_LENGTH;
  const result = new Uint8Array(png.length + chunk.length);
  result.set(png.subarray(0, insertAt), 0);
  result.set(chunk, insertAt);
  result.set(png.subarray(insertAt), insertAt + chunk.length);
  return result;
}
