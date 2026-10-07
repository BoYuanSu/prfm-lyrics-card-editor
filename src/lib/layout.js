import { PT_TO_MM } from './units';
import { fontStack } from './fonts';

// 量測時使用的解析度（px/mm），結果一律換回 mm，讓編輯畫面與輸出共用同一份排版結果
const MEASURE_PX_PER_MM = 20;
const MIN_WIDTH = 4;

let measureCtx;
const getCtx = () => (measureCtx ??= document.createElement('canvas').getContext('2d'));

export function canvasFont(b, pxPerMm) {
  const px = b.fontSize * PT_TO_MM * pxPerMm;
  return `${b.fontWeight} ${px}px ${fontStack(b.fontFamily)}`;
}

const charCount = (s) => Array.from(s).length;

/**
 * 計算文字區塊的尺寸與每一行的位置（mm）。
 * 文字只依使用者輸入的換行斷行，不自動換行，確保螢幕與輸出結果一致。
 */
export function layoutBlock(b) {
  const ctx = getCtx();
  ctx.font = canvasFont(b, MEASURE_PX_PER_MM);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

  const em = b.fontSize * PT_TO_MM;
  const letterSpacing = b.letterSpacing * em;
  const lineHeight = em * b.lineHeight;

  const metrics = ctx.measureText('Hgあ');
  const ascent = (metrics.fontBoundingBoxAscent ?? em * 0.88 * MEASURE_PX_PER_MM) / MEASURE_PX_PER_MM;
  const descent = (metrics.fontBoundingBoxDescent ?? em * 0.12 * MEASURE_PX_PER_MM) / MEASURE_PX_PER_MM;

  const rawLines = b.text.split('\n');
  const widths = rawLines.map((t) => {
    const n = charCount(t);
    return n ? ctx.measureText(t).width / MEASURE_PX_PER_MM + letterSpacing * (n - 1) : 0;
  });
  const width = Math.max(MIN_WIDTH, ...widths);

  const lines = rawLines.map((text, i) => {
    const free = width - widths[i];
    const dx = b.align === 'center' ? free / 2 : b.align === 'right' ? free : 0;
    return { text, width: widths[i], dx };
  });

  return {
    lines,
    width,
    height: rawLines.length * lineHeight,
    lineHeight,
    // CSS 行框內文字的 baseline 位置：上下 half-leading 後加上 ascent
    baseline: (lineHeight - (ascent + descent)) / 2 + ascent,
    letterSpacing,
  };
}

export function drawBlock(ctx, b, layout, pxPerMm) {
  ctx.save();
  ctx.font = canvasFont(b, pxPerMm);
  ctx.fillStyle = b.color;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const lsPx = layout.letterSpacing * pxPerMm;
  const native = 'letterSpacing' in ctx;
  if (native) ctx.letterSpacing = `${lsPx}px`;

  layout.lines.forEach((ln, i) => {
    if (!ln.text) return;
    const x = (b.x + ln.dx) * pxPerMm;
    const y = (b.y + i * layout.lineHeight + layout.baseline) * pxPerMm;
    if (native || !lsPx) {
      ctx.fillText(ln.text, x, y);
    } else {
      let cx = x;
      for (const ch of ln.text) {
        ctx.fillText(ch, cx, y);
        cx += ctx.measureText(ch).width + lsPx;
      }
    }
  });
  ctx.restore();
}
