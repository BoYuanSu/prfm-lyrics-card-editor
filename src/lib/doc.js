import { DEFAULT_SAFE } from './units';

export const uid = () => Math.random().toString(36).slice(2, 10);

export function createBlock(overrides = {}) {
  return {
    id: uid(),
    text: '新的文字',
    x: DEFAULT_SAFE.x,
    y: DEFAULT_SAFE.y,
    fontFamily: 'Noto Sans JP',
    fontWeight: 500,
    fontSize: 6, // pt
    lineHeight: 1.8, // 行高倍數
    letterSpacing: 0.05, // em
    color: '#ffffff',
    align: 'left',
    ...overrides,
  };
}

// 參考樣品排版：左上標題 + 製作資訊，下方兩欄歌詞
export function templateDoc() {
  const lyric = { fontSize: 6, fontWeight: 500, lineHeight: 1.85 };
  return {
    safe: { ...DEFAULT_SAFE },
    blocks: [
      createBlock({ text: '歌曲名稱', x: 12, y: 12, fontSize: 9, fontWeight: 700 }),
      createBlock({
        text: 'words & music by 作者名稱\nPUBLISHER NAME',
        x: 12,
        y: 17.5,
        fontSize: 4,
        fontWeight: 400,
        lineHeight: 1.6,
        color: '#c9cff5',
      }),
      createBlock({
        ...lyric,
        text: '第一段歌詞 第一行\n第一段歌詞 第二行\n第一段歌詞 第三行\n\n第二段歌詞 第一行\n第二段歌詞 第二行\n第二段歌詞 第三行',
        x: 12,
        y: 26,
      }),
      createBlock({
        ...lyric,
        text: '第三段歌詞 第一行\n第三段歌詞 第二行\n第三段歌詞 第三行\n\n第四段歌詞 第一行\n第四段歌詞 第二行',
        x: 54,
        y: 26,
      }),
    ],
  };
}

const STORAGE_KEY = 'lyrics-card:doc';
const SETTINGS_KEY = 'lyrics-card:settings';

export function loadDoc() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (d && Array.isArray(d.blocks) && d.safe) return d;
  } catch {}
  return templateDoc();
}

export function saveDoc(doc) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch {}
}

export const DEFAULT_SETTINGS = {
  showBg: true,
  bgSrc: '/backgrounds/sample.jpeg',
  bgOpacity: 1,
  paperColor: '#0b0e2b',
  showSafe: true,
};

export function loadSettings() {
  try {
    // 上傳的背景圖（data URL）可能很大，不存
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    if (s) return { ...DEFAULT_SETTINGS, ...s, bgSrc: DEFAULT_SETTINGS.bgSrc };
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveSettings(s) {
  try {
    const { bgSrc, ...rest } = s;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(rest));
  } catch {}
}
