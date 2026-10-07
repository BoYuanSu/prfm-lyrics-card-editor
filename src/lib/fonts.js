export const FONTS = [
  { family: 'Noto Sans JP', label: 'Noto Sans JP（日文黑體）' },
  { family: 'Noto Sans TC', label: 'Noto Sans TC（繁中黑體）' },
  { family: 'Zen Kaku Gothic New', label: 'Zen Kaku Gothic New' },
  { family: 'M PLUS Rounded 1c', label: 'M PLUS Rounded 1c（圓體）' },
  { family: 'Noto Serif JP', label: 'Noto Serif JP（日文明朝）' },
  { family: 'Noto Serif TC', label: 'Noto Serif TC（繁中明體）' },
];

export const WEIGHTS = [
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 700, label: 'Bold' },
];

export const fontStack = (family) => `"${family}", "Noto Sans JP", "Noto Sans TC", sans-serif`;

// 確保 canvas 繪製前，區塊用到的字型（含對應字元子集）已載入
export async function ensureFonts(blocks) {
  if (!document.fonts) return;
  await Promise.all(
    blocks.map((b) =>
      document.fonts
        .load(`${b.fontWeight} 16px "${b.fontFamily}"`, b.text || 'A')
        .catch(() => {}),
    ),
  );
  await document.fonts.ready;
}
