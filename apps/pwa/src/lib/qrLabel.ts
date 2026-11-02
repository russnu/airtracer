/**
 * QR rendering settings shared by the equipment page and printed labels.
 * Level Q survives dirt and scratches on outdoor units; the 4-module quiet
 * zone is the minimum the QR spec requires for reliable scanning.
 */
export const QR_LEVEL = "Q";
export const QR_MARGIN_MODULES = 4;

export interface LabelSize {
  id: string;
  name: string;
  hint: string;
  /** Width of the QR code itself, quiet zone included. */
  qrMm: number;
  /** Font sizes in points for the equipment name and the other lines. */
  titlePt: number;
  bodyPt: number;
}

export const LABEL_SIZES: readonly LabelSize[] = [
  { id: "small", name: "Small", hint: "Indoor units, scanned up close", qrMm: 25, titlePt: 6, bodyPt: 5 },
  { id: "medium", name: "Medium", hint: "Most indoor and outdoor units", qrMm: 40, titlePt: 8, bodyPt: 6.5 },
  { id: "large", name: "Large", hint: "Outdoor units, scanned from further away", qrMm: 50, titlePt: 9, bodyPt: 7.5 },
];

export const DEFAULT_LABEL_SIZE = LABEL_SIZES[1];

/** Space around the QR code and text, in millimetres. */
export const LABEL_PADDING_MM = 3;
/** Gap between the QR code and the first text line. */
export const LABEL_TEXT_GAP_MM = 1;
export const LABEL_LINE_HEIGHT = 1.3;
/** The label prints the equipment name and two short lines. */
const BODY_LINES = 2;

/** Length of the printed calibration line on regular paper. */
export const TEST_LINE_MM = 50;

/** PNG export resolution, typical for label and laser printers. */
export const PNG_DPI = 300;

const MM_PER_POINT = 25.4 / 72;

function lineMm(pt: number): number {
  return pt * MM_PER_POINT * LABEL_LINE_HEIGHT;
}

/** Outer label size in millimetres, rounded up to 0.1 mm. */
export function labelDimensions(size: LabelSize): { widthMm: number; heightMm: number } {
  const text = lineMm(size.titlePt) + BODY_LINES * lineMm(size.bodyPt);
  const height = LABEL_PADDING_MM * 2 + size.qrMm + LABEL_TEXT_GAP_MM + text;
  return {
    widthMm: size.qrMm + LABEL_PADDING_MM * 2,
    heightMm: Math.ceil(height * 10) / 10,
  };
}

export function mmToPixels(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi);
}

/** File name for downloads, e.g. "airtracer-qr-daikin-ftkf35-40mm.svg". */
export function labelFileName(
  brand: string,
  model: string,
  qrMm: number,
  extension: "svg" | "png",
): string {
  const slug = `${brand} ${model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `airtracer-qr-${slug || "equipment"}-${qrMm}mm.${extension}`;
}
