import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Stage from './components/Stage';
import Inspector from './components/Inspector';
import Sidebar from './components/Sidebar';
import ExportDialog from './components/ExportDialog';
import { useHistory } from './lib/history';
import { createBlock, loadDoc, saveDoc, templateDoc, loadSettings, saveSettings, uid } from './lib/doc';
import { layoutBlock } from './lib/layout';
import { ensureFonts } from './lib/fonts';
import { exportPdf, exportPng, exportJson } from './lib/exporters';
import { CSS_PX_PER_MM, clamp, round1 } from './lib/units';

const ZOOMS = [0.5, 1, 1.5, 2, 3];
// 拖曳時保留 0.01mm 精度，讓貼齊後的邊緣能完全對齊
const round2 = (n) => Math.round(n * 100) / 100;

export default function App() {
  const { doc, update, checkpoint, undo, redo, canUndo, canRedo } = useHistory(loadDoc);
  const [selectedId, setSelectedId] = useState(null);
  const [settings, setSettings] = useState(loadSettings);
  const [zoom, setZoom] = useState('fit');
  const [scale, setScale] = useState(4);
  const [fontTick, setFontTick] = useState(0);
  const [showExport, setShowExport] = useState(false);
  const textareaRef = useRef(null);
  const importRef = useRef(null);

  useEffect(() => saveDoc(doc), [doc]);
  useEffect(() => saveSettings(settings), [settings]);

  // 字型載入完成後重新量測文字尺寸
  useEffect(() => {
    const bump = () => setFontTick((t) => t + 1);
    document.fonts?.addEventListener('loadingdone', bump);
    ensureFonts(doc.blocks).then(bump);
    return () => document.fonts?.removeEventListener('loadingdone', bump);
  }, []);

  const layouts = useMemo(
    () => Object.fromEntries(doc.blocks.map((b) => [b.id, layoutBlock(b)])),
    [doc.blocks, fontTick],
  );

  const selected = doc.blocks.find((b) => b.id === selectedId) ?? null;

  // ---- 區塊操作 ----
  const patchBlock = useCallback(
    (id, patch, mode) =>
      update((d) => ({ ...d, blocks: d.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) }), mode),
    [update],
  );

  const addBlock = () => {
    const last = doc.blocks[doc.blocks.length - 1];
    const L = last && layouts[last.id];
    const y = L ? Math.min(last.y + L.height + 3, doc.safe.y + doc.safe.h - 5) : doc.safe.y;
    const b = createBlock({ x: doc.safe.x, y: round1(y), ...(last && pickStyle(last)) });
    update((d) => ({ ...d, blocks: [...d.blocks, b] }));
    setSelectedId(b.id);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    });
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    update((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== selectedId) }));
    setSelectedId(null);
  };

  const duplicateSelected = () => {
    if (!selected) return;
    const L = layouts[selected.id];
    const { safe } = doc;
    const copy = {
      ...selected,
      id: uid(),
      x: clamp(selected.x + 3, safe.x, Math.max(safe.x, safe.x + safe.w - L.width)),
      y: clamp(selected.y + 3, safe.y, Math.max(safe.y, safe.y + safe.h - L.height)),
    };
    update((d) => ({ ...d, blocks: [...d.blocks, copy] }));
    setSelectedId(copy.id);
  };

  const moveLayer = (dir) => {
    update((d) => {
      const i = d.blocks.findIndex((b) => b.id === selectedId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.blocks.length) return d;
      const blocks = [...d.blocks];
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      return { ...d, blocks };
    });
  };

  const alignTo = (where) => {
    if (!selected) return;
    const L = layouts[selected.id];
    const { x, y, w, h } = doc.safe;
    const pos = {
      left: { x },
      hcenter: { x: x + (w - L.width) / 2 },
      right: { x: x + w - L.width },
      top: { y },
      vcenter: { y: y + (h - L.height) / 2 },
      bottom: { y: y + h - L.height },
    }[where];
    patchBlock(selected.id, pos);
  };

  const nudge = (dx, dy) => {
    if (!selected) return;
    const L = layouts[selected.id];
    const { safe } = doc;
    patchBlock(
      selected.id,
      {
        x: round1(clamp(selected.x + dx, safe.x, Math.max(safe.x, safe.x + safe.w - L.width))),
        y: round1(clamp(selected.y + dy, safe.y, Math.max(safe.y, safe.y + safe.h - L.height))),
      },
      `nudge-${selected.id}`,
    );
  };

  const changeSafe = (patch) => {
    update((d) => {
      const safe = { ...d.safe, ...patch };
      // 範圍改變後，把區塊收回範圍內
      const blocks = d.blocks.map((b) => {
        const L = layouts[b.id];
        if (!L) return b;
        return {
          ...b,
          x: clamp(b.x, safe.x, Math.max(safe.x, safe.x + safe.w - L.width)),
          y: clamp(b.y, safe.y, Math.max(safe.y, safe.y + safe.h - L.height)),
        };
      });
      return { ...d, safe, blocks };
    });
  };

  // ---- 鍵盤快捷鍵 ----
  useEffect(() => {
    const onKey = (e) => {
      const typing = e.target.closest?.('input, textarea, select');
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y' && !typing) {
        e.preventDefault();
        redo();
        return;
      }
      if (typing) {
        if (e.key === 'Escape') e.target.blur();
        return;
      }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      const step = e.shiftKey ? 1 : 0.1;
      const arrows = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (arrows[e.key] && selected) {
        e.preventDefault();
        nudge(...arrows[e.key]);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault();
        deleteSelected();
      } else if (e.key === 'Escape') {
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ---- 匯入 / 匯出 ----
  const outOfBounds = doc.blocks.filter((b) => {
    const L = layouts[b.id];
    const s = doc.safe;
    return L && (b.x < s.x - 0.01 || b.y < s.y - 0.01 || b.x + L.width > s.x + s.w + 0.01 || b.y + L.height > s.y + s.h + 0.01);
  });
  const warnings = [];
  if (outOfBounds.length) warnings.push(`有 ${outOfBounds.length} 個文字區塊超出可編輯範圍，請縮小字級或調整內容。`);
  if (doc.blocks.some((b) => isLight(b.color)))
    warnings.push('含有白色／淺色文字：若只輸出文字並印在白紙上會看不見；印在既有卡片上需印刷廠支援白墨。');

  const doExport = async (opts) => {
    const background = opts.includeBg
      ? { paperColor: settings.paperColor, src: settings.showBg ? settings.bgSrc : null, opacity: settings.bgOpacity }
      : null;
    const guides = opts.cardBorder || opts.safeBorder ? { card: opts.cardBorder, safe: opts.safeBorder } : null;
    const args = { ...opts, background, guides };
    if (opts.format === 'pdf') await exportPdf(doc, args);
    else await exportPng(doc, args);
  };

  const importJson = async (file) => {
    try {
      const d = JSON.parse(await file.text());
      if (!Array.isArray(d.blocks) || !d.safe) throw new Error('格式不正確');
      update({ safe: d.safe, blocks: d.blocks.map((b) => createBlock({ ...b, id: uid() })) });
      setSelectedId(null);
    } catch (err) {
      alert(`匯入失敗：${err.message}`);
    }
  };

  const handleBgUpload = (file) => {
    const reader = new FileReader();
    reader.onload = () => setSettings((s) => ({ ...s, bgSrc: reader.result, showBg: true }));
    reader.readAsDataURL(file);
  };

  const zoomLabel = `${Math.round((scale / CSS_PX_PER_MM) * 100)}%`;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          <div>
            <h1>歌詞卡排版工具</h1>
            <p>120 × 120 mm · CD 盒尺寸</p>
          </div>
        </div>

        <div className="toolbar">
          <button className="primary" onClick={addBlock}>＋ 新增文字</button>
          <span className="sep" />
          <button onClick={undo} disabled={!canUndo} title="復原 ⌘Z">復原</button>
          <button onClick={redo} disabled={!canRedo} title="重做 ⌘⇧Z">重做</button>
          <span className="sep" />
          <button
            onClick={() => {
              if (confirm('套用範例版型會取代目前的內容（可用「復原」還原），確定嗎？')) {
                update(templateDoc());
                setSelectedId(null);
              }
            }}
          >
            範例版型
          </button>
          <button onClick={() => exportJson(doc, 'lyrics-card')}>儲存專案</button>
          <button onClick={() => importRef.current.click()}>開啟專案</button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              if (e.target.files[0]) importJson(e.target.files[0]);
              e.target.value = '';
            }}
          />
          <span className="sep" />
          <select
            className="zoom"
            value={zoom}
            onChange={(e) => setZoom(e.target.value === 'fit' ? 'fit' : Number(e.target.value))}
            title="縮放（100% 為螢幕上的實際尺寸）"
          >
            <option value="fit">符合視窗（{zoomLabel}）</option>
            {ZOOMS.map((z) => (
              <option key={z} value={z * CSS_PX_PER_MM}>{z * 100}%{z === 1 ? '（實際尺寸）' : ''}</option>
            ))}
          </select>
          <button className="accent" onClick={() => setShowExport(true)}>輸出列印檔</button>
        </div>
      </header>

      <div className="workspace">
        <Sidebar
          doc={doc}
          layouts={layouts}
          selectedId={selectedId}
          settings={settings}
          onSelect={setSelectedId}
          onSafeChange={changeSafe}
          onSettings={(p) => setSettings((s) => ({ ...s, ...p }))}
          onBgUpload={handleBgUpload}
        />
        <Stage
          doc={doc}
          layouts={layouts}
          selectedId={selectedId}
          settings={settings}
          zoom={zoom}
          onScaleChange={setScale}
          onSelect={setSelectedId}
          onDragStart={checkpoint}
          onMove={(id, x, y) => patchBlock(id, { x: round2(x), y: round2(y) }, 'replace')}
          onEditRequest={(id) => {
            setSelectedId(id);
            requestAnimationFrame(() => textareaRef.current?.focus());
          }}
        />
        <Inspector
          block={selected}
          layout={selected && layouts[selected.id]}
          safe={doc.safe}
          textareaRef={textareaRef}
          onChange={patchBlock}
          onAlignTo={alignTo}
          onDuplicate={duplicateSelected}
          onDelete={deleteSelected}
          onLayer={moveLayer}
        />
      </div>

      {showExport && <ExportDialog warnings={warnings} onExport={doExport} onClose={() => setShowExport(false)} />}
    </div>
  );
}

const pickStyle = ({ fontFamily, fontWeight, fontSize, lineHeight, letterSpacing, color, align }) => ({
  fontFamily,
  fontWeight,
  fontSize,
  lineHeight,
  letterSpacing,
  color,
  align,
});

function isLight(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 225;
}
