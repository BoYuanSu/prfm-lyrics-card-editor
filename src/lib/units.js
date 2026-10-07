// 所有版面座標都以 mm 為單位，只有在畫面/輸出時才換算成像素
export const CARD_SIZE = 120; // 紙張 120mm × 120mm
export const PT_TO_MM = 25.4 / 72;
export const CSS_PX_PER_MM = 96 / 25.4; // 螢幕上「100%」的實際尺寸

export const DEFAULT_SAFE = { x: 12, y: 12, w: 80, h: 95 };

export const round1 = (n) => Math.round(n * 10) / 10;
export const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
