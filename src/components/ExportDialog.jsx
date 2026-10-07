import { useState } from 'react';

export default function ExportDialog({ warnings, onExport, onClose }) {
  const [opts, setOpts] = useState({
    format: 'pdf',
    page: 'card',
    dpi: 600,
    includeBg: false,
    cardBorder: false,
    safeBorder: false,
    filename: 'lyrics-card',
  });
  const [busy, setBusy] = useState(false);
  const set = (p) => setOpts((o) => ({ ...o, ...p }));

  const run = async () => {
    setBusy(true);
    try {
      await onExport(opts);
      onClose();
    } catch (err) {
      console.error(err);
      alert(`輸出失敗：${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>輸出列印檔</h2>

        <div className="field">
          <span className="field-label">格式</span>
          <div className="seg">
            <button className={opts.format === 'pdf' ? 'on' : ''} onClick={() => set({ format: 'pdf' })}>PDF</button>
            <button className={opts.format === 'png' ? 'on' : ''} onClick={() => set({ format: 'png' })}>PNG</button>
          </div>
        </div>

        {opts.format === 'pdf' && (
          <div className="field">
            <span className="field-label">頁面</span>
            <div className="seg">
              <button className={opts.page === 'card' ? 'on' : ''} onClick={() => set({ page: 'card' })}>120×120 mm 實際尺寸</button>
              <button className={opts.page === 'a4' ? 'on' : ''} onClick={() => set({ page: 'a4' })}>A4 置中＋裁切線</button>
            </div>
          </div>
        )}

        <div className="field">
          <span className="field-label">解析度</span>
          <div className="seg">
            {[300, 600, 1200].map((d) => (
              <button key={d} className={opts.dpi === d ? 'on' : ''} onClick={() => set({ dpi: d })}>{d} dpi</button>
            ))}
          </div>
        </div>

        <label className="check">
          <input type="checkbox" checked={opts.includeBg} onChange={(e) => set({ includeBg: e.target.checked })} />
          包含預覽背景與紙張底色（關閉時只輸出文字，背景透明）
        </label>

        <div className="field">
          <span className="field-label">打樣參考框線（方便印出後照著定位手寫）</span>
          <label className="check">
            <input type="checkbox" checked={opts.cardBorder} onChange={(e) => set({ cardBorder: e.target.checked })} />
            卡片外框（120 × 120 mm 實線）
          </label>
          <label className="check">
            <input type="checkbox" checked={opts.safeBorder} onChange={(e) => set({ safeBorder: e.target.checked })} />
            可輸入範圍框（虛線）
          </label>
        </div>

        <label className="field">
          <span className="field-label">檔名</span>
          <input type="text" value={opts.filename} onChange={(e) => set({ filename: e.target.value || 'lyrics-card' })} />
        </label>

        <div className="notes">
          <p>列印時請在印表機設定選擇「實際大小／100%」，不要勾選「符合頁面大小」，才能保持 120 × 120 mm。</p>
          {warnings.map((w) => (
            <p key={w} className="warn">⚠ {w}</p>
          ))}
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary" disabled={busy} onClick={run}>{busy ? '輸出中…' : '輸出'}</button>
        </div>
      </div>
    </div>
  );
}
