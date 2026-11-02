import { useRef, useState } from "react";
import type { Ref } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import {
  PiDownloadSimpleBold,
  PiPrinterBold,
} from "react-icons/pi";
import { assetsApi } from "../../lib/api-client";
import { Alert, BackButton, Button, Card, Spinner } from "../../components/ui";
import { buttonClasses } from "../../components/ui/buttonClasses";
import type { Asset } from "../../types/api";
import {
  DEFAULT_LABEL_SIZE,
  LABEL_LINE_HEIGHT,
  LABEL_PADDING_MM,
  LABEL_SIZES,
  LABEL_TEXT_GAP_MM,
  PNG_DPI,
  QR_LEVEL,
  QR_MARGIN_MODULES,
  TEST_LINE_MM,
  labelDimensions,
  labelFileName,
  mmToPixels,
} from "../../lib/qrLabel";
import type { LabelSize } from "../../lib/qrLabel";
import { withPngDpi } from "../../lib/png";

type PaperMode = "sheet" | "label";

/** Margin on regular paper, clear of most printers' unprintable edge. */
const SHEET_MARGIN_MM = 12;

const PAPER_OPTIONS: { id: PaperMode; name: string; hint: string }[] = [
  {
    id: "sheet",
    name: "Regular paper",
    hint: "A4 or Letter, with a cut line and a test line",
  },
  {
    id: "label",
    name: "Label printer",
    hint: "The page is set to the label's exact size",
  },
];

function pageCss(paper: PaperMode, size: LabelSize): string {
  const { widthMm, heightMm } = labelDimensions(size);
  const page =
    paper === "label"
      ? `size: ${widthMm}mm ${heightMm}mm; margin: 0;`
      : `size: auto; margin: ${SHEET_MARGIN_MM}mm;`;
  // While printing, only the portal outside #root is shown.
  return `@media print {
  @page { ${page} }
  html, body { background: #fff !important; }
  body > #root { display: none !important; }
}`;
}

interface QrLabelProps {
  asset: Asset;
  url: string;
  size: LabelSize;
  cutLine: boolean;
  svgRef?: Ref<SVGSVGElement>;
}

/** The label at its physical size. Everything is sized in mm and pt. */
function QrLabel({ asset, url, size, cutLine, svgRef }: QrLabelProps) {
  const { widthMm, heightMm } = labelDimensions(size);
  const name = `${asset.brand} ${asset.model}`.trim();

  return (
    <div
      className="bg-white text-black text-center overflow-hidden box-border"
      style={{
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        padding: `${LABEL_PADDING_MM}mm`,
        lineHeight: LABEL_LINE_HEIGHT,
        outline: cutLine ? "0.2mm dashed #94a3b8" : undefined,
        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
      }}
    >
      <QRCodeSVG
        ref={svgRef}
        value={url}
        level={QR_LEVEL}
        marginSize={QR_MARGIN_MODULES}
        title={`QR code for ${name}`}
        style={{ display: "block", width: `${size.qrMm}mm`, height: `${size.qrMm}mm` }}
      />
      <div style={{ marginTop: `${LABEL_TEXT_GAP_MM}mm` }}>
        <p
          className="font-semibold truncate"
          style={{ fontSize: `${size.titlePt}pt` }}
        >
          {name}
        </p>
        <p style={{ fontSize: `${size.bodyPt}pt` }}>Scan for service history</p>
        <p className="font-semibold" style={{ fontSize: `${size.bodyPt}pt` }}>
          AirTracer
        </p>
      </div>
    </div>
  );
}

/** A ruler for checking that the printer did not scale the page. */
function TestLine() {
  return (
    <div className="text-black" style={{ marginTop: "8mm", width: `${TEST_LINE_MM}mm` }}>
      <div
        style={{
          height: "2mm",
          borderLeft: "0.3mm solid #000",
          borderRight: "0.3mm solid #000",
          borderBottom: "0.3mm solid #000",
          printColorAdjust: "exact",
          WebkitPrintColorAdjust: "exact",
        }}
      />
      <p style={{ fontSize: "7pt", marginTop: "1mm" }}>
        This line should measure {TEST_LINE_MM} mm. If it doesn't, print again
        at 100% scale (turn off "Fit to page").
      </p>
    </div>
  );
}

function download(blob: Blob, fileName: string) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser time to start the download before revoking.
  window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

/** Standalone SVG markup for the QR code at its physical size. */
function serializeSvg(svg: SVGSVGElement, widthAttr: string): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", widthAttr);
  clone.setAttribute("height", widthAttr);
  clone.removeAttribute("style");
  return new XMLSerializer().serializeToString(clone);
}

async function svgToPng(svg: SVGSVGElement, pixels: number): Promise<Blob> {
  const markup = serializeSvg(svg, String(pixels));
  const svgUrl = URL.createObjectURL(
    new Blob([markup], { type: "image/svg+xml" }),
  );
  try {
    const image = new Image();
    image.src = svgUrl;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = pixels;
    canvas.height = pixels;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is not available.");
    }
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, 0, pixels, pixels);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) {
      throw new Error("Could not create the PNG.");
    }
    const bytes = withPngDpi(new Uint8Array(await blob.arrayBuffer()), PNG_DPI);
    return new Blob([bytes as BlobPart], { type: "image/png" });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export function EquipmentLabelPage() {
  const { id } = useParams<{ id: string }>();
  const [sizeId, setSizeId] = useState(DEFAULT_LABEL_SIZE.id);
  const [paper, setPaper] = useState<PaperMode>("sheet");
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isPreparingPng, setIsPreparingPng] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const {
    data: asset,
    isLoading,
    error,
  } = useQuery<Asset>({
    queryKey: ["assets", id],
    queryFn: () => assetsApi.findOne(id!),
    enabled: !!id,
  });

  const size = LABEL_SIZES.find((s) => s.id === sizeId) ?? DEFAULT_LABEL_SIZE;
  const backPath = `/equipment/${id}`;

  const header = (
    <header className="bg-white border-b border-primary-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
        <BackButton fallback={backPath} label="Back to equipment" />
        <h1 className="text-lg font-semibold text-brand-tertiary">
          Print QR label
        </h1>
      </div>
    </header>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-primary-50">
        <Spinner size="lg" />
      </div>
    );
  }

  const qrCode = asset?.qrCode ?? null;
  const unavailable =
    error || !asset
      ? "Failed to load equipment details."
      : !qrCode
        ? "This equipment has no QR code yet. Generate one on the equipment page first."
        : !qrCode.isActive
          ? "This QR code is inactive, so a printed label would show no passport."
          : null;

  if (unavailable || !asset || !qrCode) {
    return (
      <div className="min-h-screen bg-primary-50">
        {header}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-4">
          <Alert variant={error ? "error" : "warning"} title="Can't print a label">
            {unavailable}
          </Alert>
          <Link to={backPath} className={buttonClasses("outline")}>
            Back to equipment
          </Link>
        </main>
      </div>
    );
  }

  const handlePrint = async () => {
    // Make sure the label text is not printed in a fallback font.
    await document.fonts?.ready;
    window.print();
  };

  const handleDownloadSvg = () => {
    setDownloadError(null);
    if (!svgRef.current) {
      return;
    }
    const markup = serializeSvg(svgRef.current, `${size.qrMm}mm`);
    download(
      new Blob([markup], { type: "image/svg+xml" }),
      labelFileName(asset.brand, asset.model, size.qrMm, "svg"),
    );
  };

  const handleDownloadPng = async () => {
    setDownloadError(null);
    if (!svgRef.current) {
      return;
    }
    setIsPreparingPng(true);
    try {
      const png = await svgToPng(svgRef.current, mmToPixels(size.qrMm, PNG_DPI));
      download(png, labelFileName(asset.brand, asset.model, size.qrMm, "png"));
    } catch (err) {
      console.error("AirTracer: PNG export failed.", err);
      setDownloadError("Could not create the PNG. Try the SVG download instead.");
    } finally {
      setIsPreparingPng(false);
    }
  };

  const printArea = (
    <div className="hidden print:block">
      <QrLabel asset={asset} url={qrCode.url} size={size} cutLine={paper === "sheet"} />
      {paper === "sheet" && <TestLine />}
    </div>
  );

  return (
    <div className="min-h-screen bg-primary-50 pb-12">
      <style>{pageCss(paper, size)}</style>
      {header}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="space-y-6">
          <fieldset>
            <legend className="text-sm font-semibold text-primary-900 mb-2">
              Label size
            </legend>
            <div className="space-y-2">
              {LABEL_SIZES.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors has-focus-visible:ring-2 has-focus-visible:ring-accent-500 ${
                    option.id === size.id
                      ? "border-accent-500 bg-accent-50"
                      : "border-primary-200 hover:border-primary-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="label-size"
                    value={option.id}
                    checked={option.id === size.id}
                    onChange={() => setSizeId(option.id)}
                    className="mt-1 accent-accent-600"
                  />
                  <span>
                    <span className="block text-sm font-medium text-primary-900">
                      {option.name} · {option.qrMm} mm QR code
                    </span>
                    <span className="block text-xs text-primary-600">
                      {option.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-primary-900 mb-2">
              Printing on
            </legend>
            <div className="space-y-2">
              {PAPER_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors has-focus-visible:ring-2 has-focus-visible:ring-accent-500 ${
                    option.id === paper
                      ? "border-accent-500 bg-accent-50"
                      : "border-primary-200 hover:border-primary-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="paper"
                    value={option.id}
                    checked={option.id === paper}
                    onChange={() => setPaper(option.id)}
                    className="mt-1 accent-accent-600"
                  />
                  <span>
                    <span className="block text-sm font-medium text-primary-900">
                      {option.name}
                    </span>
                    <span className="block text-xs text-primary-600">
                      {option.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={handlePrint}
              icon={<PiPrinterBold className="w-4 h-4" />}
            >
              Print label
            </Button>
            <p className="text-xs text-primary-600">
              In the print dialog, set the scale to 100% (turn off "Fit to
              page") so the label prints at its real size.
              {paper === "label" &&
                " Choose the label size in your printer's settings too."}
            </p>
          </div>

          <div className="space-y-2 border-t border-primary-200 pt-4">
            <p className="text-sm font-semibold text-primary-900">
              Download QR code
            </p>
            <p className="text-xs text-primary-600">
              For label-printer software, or if printing doesn't work on this
              device. The file is the QR code only, at {size.qrMm} mm.
            </p>
            {downloadError && (
              <Alert variant="error" onDismiss={() => setDownloadError(null)}>
                {downloadError}
              </Alert>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSvg}
                icon={<PiDownloadSimpleBold className="w-4 h-4" />}
              >
                SVG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPng}
                isLoading={isPreparingPng}
                icon={<PiDownloadSimpleBold className="w-4 h-4" />}
              >
                PNG ({PNG_DPI} dpi)
              </Button>
            </div>
          </div>
        </Card>

        <section aria-labelledby="label-preview-heading">
          <h2
            id="label-preview-heading"
            className="text-sm font-semibold text-primary-900 mb-2"
          >
            Preview
          </h2>
          <Card className="flex flex-col items-center gap-3 bg-primary-100">
            <div className="shadow-card">
              <QrLabel
                asset={asset}
                url={qrCode.url}
                size={size}
                cutLine={false}
                svgRef={svgRef}
              />
            </div>
            <p className="text-xs text-primary-600 text-center">
              Label {labelDimensions(size).widthMm} ×{" "}
              {labelDimensions(size).heightMm} mm. Screen sizes vary, so the
              preview may not match the printed size.
            </p>
          </Card>
        </section>
      </main>

      {createPortal(printArea, document.body)}
    </div>
  );
}
