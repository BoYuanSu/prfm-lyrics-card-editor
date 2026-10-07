import { CARD_SIZE } from './units';
import { layoutBlock, drawBlock } from './layout';
import { ensureFonts } from './fonts';

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

// 打樣用參考框線（mm）
const GUIDE_COLOR = '#8c8c8c';
const GUIDE_WIDTH = 0.2;
const GUIDE_DASH = [1.5, 1];

/** 以指定 DPI 將整張卡片畫到 canvas（1:1 實際尺寸） */
export async function renderCard(doc, { dpi, background, guides }) {
  await ensureFonts(doc.blocks);
  const pxPerMm = dpi / 25.4;
  const size = Math.round(CARD_SIZE * pxPerMm);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (background) {
    ctx.fillStyle = background.paperColor;
    ctx.fillRect(0, 0, size, size);
    if (background.src) {
      const img = await loadImage(background.src);
      // object-fit: cover
      const s = Math.max(size / img.width, size / img.height);
      const w = img.width * s;
      const h = img.height * s;
      ctx.globalAlpha = background.opacity;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      ctx.globalAlpha = 1;
    }
  }

  if (guides) drawGuidesCanvas(ctx, doc.safe, guides, pxPerMm);
  for (const b of doc.blocks) drawBlock(ctx, b, layoutBlock(b), pxPerMm);
  return canvas;
}

function drawGuidesCanvas(ctx, safe, guides, pxPerMm) {
  const lw = GUIDE_WIDTH * pxPerMm;
  ctx.save();
  ctx.strokeStyle = GUIDE_COLOR;
  ctx.lineWidth = lw;
  if (guides.card) {
    // 往內縮半個線寬，讓整條線落在紙張內
    const size = CARD_SIZE * pxPerMm;
    ctx.strokeRect(lw / 2, lw / 2, size - lw, size - lw);
  }
  if (guides.safe) {
    ctx.setLineDash(GUIDE_DASH.map((d) => d * pxPerMm));
    ctx.strokeRect(safe.x * pxPerMm, safe.y * pxPerMm, safe.w * pxPerMm, safe.h * pxPerMm);
  }
  ctx.restore();
}

// PDF 用向量線條，列印出來的位置最精準
function drawGuidesPdf(pdf, safe, guides, ox, oy, isA4) {
  pdf.setDrawColor(GUIDE_COLOR);
  pdf.setLineWidth(GUIDE_WIDTH);
  if (guides.card) {
    // A4 版框線就是裁切線位置；卡片尺寸頁面則內縮半個線寬，避免被頁緣切掉
    const inset = isA4 ? 0 : GUIDE_WIDTH / 2;
    pdf.rect(ox + inset, oy + inset, CARD_SIZE - inset * 2, CARD_SIZE - inset * 2, 'S');
  }
  if (guides.safe) {
    pdf.setLineDashPattern(GUIDE_DASH, 0);
    pdf.rect(ox + safe.x, oy + safe.y, safe.w, safe.h, 'S');
    pdf.setLineDashPattern([], 0);
  }
}

// ---- PNG：寫入 pHYs，讓影像軟體/印表機知道正確 DPI ----
function crc32(bytes) {
  let crc = -1;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
}

function withDpi(buffer, dpi) {
  const src = new Uint8Array(buffer);
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  view.setUint32(8, ppm);
  view.setUint32(12, ppm);
  chunk[16] = 1; // 單位：公尺
  view.setUint32(17, crc32(chunk.subarray(4, 17)));
  const IHDR_END = 33; // 8 bytes signature + 25 bytes IHDR
  const out = new Uint8Array(src.length + chunk.length);
  out.set(src.subarray(0, IHDR_END), 0);
  out.set(chunk, IHDR_END);
  out.set(src.subarray(IHDR_END), IHDR_END + chunk.length);
  return out;
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportPng(doc, opts) {
  const canvas = await renderCard(doc, opts);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  const bytes = withDpi(await blob.arrayBuffer(), opts.dpi);
  download(new Blob([bytes], { type: 'image/png' }), `${opts.filename}.png`);
}

/**
 * PDF：
 * - card：頁面就是 120×120mm，適合直接交給印刷廠
 * - a4：卡片置中於 A4 並加上裁切線，適合家用印表機以「實際大小」列印後裁切
 */
export async function exportPdf(doc, opts) {
  const canvas = await renderCard(doc, { ...opts, guides: null });
  const { jsPDF } = await import('jspdf');
  const isA4 = opts.page === 'a4';
  const pdf = new jsPDF({
    unit: 'mm',
    format: isA4 ? 'a4' : [CARD_SIZE, CARD_SIZE],
    orientation: 'portrait',
    compress: true,
  });
  const ox = isA4 ? (210 - CARD_SIZE) / 2 : 0;
  const oy = isA4 ? (297 - CARD_SIZE) / 2 : 0;
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', ox, oy, CARD_SIZE, CARD_SIZE, undefined, 'FAST');
  if (opts.guides) drawGuidesPdf(pdf, doc.safe, opts.guides, ox, oy, isA4);

  if (isA4) {
    drawCropMarks(pdf, ox, oy, CARD_SIZE);
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.text(
      `Trim size ${CARD_SIZE} x ${CARD_SIZE} mm  -  Print at 100% / Actual size (do not "fit to page")`,
      105,
      oy + CARD_SIZE + 14,
      { align: 'center' },
    );
  }
  pdf.save(`${opts.filename}.pdf`);
}

function drawCropMarks(pdf, x, y, size) {
  const gap = 3;
  const len = 6;
  pdf.setDrawColor(0);
  pdf.setLineWidth(0.15);
  const corners = [
    [x, y, -1, -1],
    [x + size, y, 1, -1],
    [x, y + size, -1, 1],
    [x + size, y + size, 1, 1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    pdf.line(cx + sx * gap, cy, cx + sx * (gap + len), cy);
    pdf.line(cx, cy + sy * gap, cx, cy + sy * (gap + len));
  }
}

export function exportJson(doc, filename) {
  download(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }), `${filename}.json`);
}
