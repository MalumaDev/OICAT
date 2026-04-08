import { jsPDF } from 'jspdf';
import { renderSideBySideCanvas, renderSliderCanvas } from './exportStatic';

export type PaperSize = 'a4' | 'a3' | 'letter';
export type Orientation = 'landscape' | 'portrait';
export type FitMode = 'fit' | 'actual';

export interface PdfSettings {
  paper: PaperSize;
  orientation: Orientation;
  fit: FitMode;
  showLabels: boolean;
}

const PAPER_DIMS: Record<PaperSize, [number, number]> = {
  a4:     [210, 297],
  a3:     [297, 420],
  letter: [215.9, 279.4],
};

export async function renderSideBySidePdf(settings: PdfSettings): Promise<Uint8Array> {
  const canvas = await renderSideBySideCanvas({ scale: 2, quality: 1, showLabels: settings.showLabels });
  return canvasToPdf(canvas, settings);
}

export async function renderSliderPdf(settings: PdfSettings): Promise<Uint8Array> {
  const canvas = await renderSliderCanvas({ scale: 2, quality: 1, showLabels: settings.showLabels });
  return canvasToPdf(canvas, settings);
}

function canvasToPdf(canvas: HTMLCanvasElement, settings: PdfSettings): Uint8Array {
  const [pw, ph] = PAPER_DIMS[settings.paper];
  const isLandscape = settings.orientation === 'landscape';
  const pageW = isLandscape ? ph : pw;
  const pageH = isLandscape ? pw : ph;

  const pdf = new jsPDF({
    orientation: settings.orientation,
    unit: 'mm',
    format: settings.paper,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const imgAspect = canvas.width / canvas.height;

  let drawW: number, drawH: number, drawX: number, drawY: number;

  if (settings.fit === 'fit') {
    const pageAspect = pageW / pageH;
    if (imgAspect > pageAspect) {
      drawW = pageW;
      drawH = pageW / imgAspect;
    } else {
      drawH = pageH;
      drawW = pageH * imgAspect;
    }
    drawX = (pageW - drawW) / 2;
    drawY = (pageH - drawH) / 2;
  } else {
    // Actual size: 96dpi → mm conversion
    const pxPerMm = 96 / 25.4;
    drawW = canvas.width / pxPerMm;
    drawH = canvas.height / pxPerMm;
    drawX = 0;
    drawY = 0;
  }

  pdf.addImage(imgData, 'JPEG', drawX, drawY, drawW, drawH);
  return pdf.output('arraybuffer') as unknown as Uint8Array;
}
