import NumberField from './NumberField';
import { CARD_SIZE, DEFAULT_SAFE } from '../lib/units';

export default function Sidebar({ doc, layouts, selectedId, settings, onSelect, onSafeChange, onSettings, onBgUpload }) {
  const { safe } = doc;
  return (
    <aside className="panel sidebar">
      <section>
        <h3>文字區塊</h3>
        {doc.blocks.length === 0 && <p className="sub">尚無區塊，按上方「新增文字」開始。</p>}
        <ul className="layers">
          {[...doc.blocks].reverse().map((b) => (
            <li key={b.id}>
              <button className={b.id === selectedId ? 'on' : ''} onClick={() => onSelect(b.id)}>
                <span className="layer-text">{b.text.split('\n').find((l) => l.trim()) || '（空白）'}</span>
                <span className="layer-meta">{b.fontSize}pt · {b.text.split('\n').length} 行</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>可編輯範圍</h3>
        <p className="sub">紙張 {CARD_SIZE} × {CARD_SIZE} mm，文字只能放在此範圍內。</p>
        <div className="grid-2">
          <NumberField label="左邊距" unit="mm" value={safe.x} min={0} max={CARD_SIZE - safe.w} onChange={(v) => onSafeChange({ x: v })} />
          <NumberField label="上邊距" unit="mm" value={safe.y} min={0} max={CARD_SIZE - safe.h} onChange={(v) => onSafeChange({ y: v })} />
          <NumberField label="寬" unit="mm" value={safe.w} min={10} max={CARD_SIZE - safe.x} onChange={(v) => onSafeChange({ w: v })} />
          <NumberField label="高" unit="mm" value={safe.h} min={10} max={CARD_SIZE - safe.y} onChange={(v) => onSafeChange({ h: v })} />
        </div>
        <div className="row-buttons">
          <button onClick={() => onSafeChange({ x: (CARD_SIZE - safe.w) / 2, y: (CARD_SIZE - safe.h) / 2 })}>置中於紙張</button>
          <button onClick={() => onSafeChange({ ...DEFAULT_SAFE })}>重設</button>
        </div>
        <label className="check">
          <input type="checkbox" checked={settings.showSafe} onChange={(e) => onSettings({ showSafe: e.target.checked })} />
          顯示範圍框
        </label>
      </section>

      <section>
        <h3>預覽背景</h3>
        <p className="sub">背景只用來預覽；輸出時可選擇是否一併輸出。</p>
        <label className="check">
          <input type="checkbox" checked={settings.showBg} onChange={(e) => onSettings({ showBg: e.target.checked })} />
          顯示背景圖
        </label>
        <div className="row-buttons">
          <label className="button-like">
            上傳背景圖
            <input type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && onBgUpload(e.target.files[0])} />
          </label>
          <button onClick={() => onSettings({ bgSrc: '/backgrounds/sample.jpeg', showBg: true })}>使用樣品</button>
        </div>
        <label className="field">
          <span className="field-label">背景透明度 {Math.round(settings.bgOpacity * 100)}%</span>
          <input type="range" min={0} max={1} step={0.05} value={settings.bgOpacity} onChange={(e) => onSettings({ bgOpacity: Number(e.target.value) })} />
        </label>
        <label className="field inline">
          <span className="field-label">紙張底色</span>
          <input type="color" value={settings.paperColor} onChange={(e) => onSettings({ paperColor: e.target.value })} />
        </label>
      </section>
    </aside>
  );
}
