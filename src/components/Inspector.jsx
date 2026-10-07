import NumberField from './NumberField';
import { FONTS, WEIGHTS } from '../lib/fonts';
import { round1 } from '../lib/units';

// 取自樣品：白字、淡藍白、全像光譜中的青/黃/紅，以及深夜藍
const SWATCHES = ['#ffffff', '#e4e8ff', '#b7c0ff', '#2ad1ff', '#ffe14a', '#ff4d6d', '#0b0e2b', '#000000'];

export default function Inspector({ block, layout, safe, textareaRef, onChange, onAlignTo, onDuplicate, onDelete, onLayer }) {
  if (!block) {
    return (
      <aside className="panel inspector empty">
        <p className="hint">選取一個文字區塊來編輯內容與樣式。</p>
        <ul className="shortcuts">
          <li><kbd>拖曳</kbd> 移動區塊，接近其他區塊或範圍邊界時會自動貼齊</li>
          <li><kbd>Alt</kbd> 拖曳時按住可暫時關閉貼齊</li>
          <li><kbd>←↑→↓</kbd> 微調 0.1mm，加 <kbd>Shift</kbd> 為 1mm</li>
          <li><kbd>⌘/Ctrl Z</kbd> 復原，<kbd>⌘/Ctrl Shift Z</kbd> 重做</li>
          <li><kbd>⌘/Ctrl D</kbd> 複製，<kbd>Delete</kbd> 刪除</li>
          <li>雙擊區塊可直接跳到文字輸入框</li>
        </ul>
      </aside>
    );
  }

  const set = (patch, key) => onChange(block.id, patch, key);

  return (
    <aside className="panel inspector">
      <section>
        <h3>文字內容</h3>
        <textarea
          ref={textareaRef}
          className="text-input"
          value={block.text}
          rows={10}
          spellCheck={false}
          onChange={(e) => set({ text: e.target.value }, `text-${block.id}`)}
        />
        <p className="sub">
          以 Enter 換行；區塊尺寸 {round1(layout?.width ?? 0)} × {round1(layout?.height ?? 0)} mm
        </p>
      </section>

      <section>
        <h3>字型</h3>
        <label className="field">
          <span className="field-label">字體</span>
          <select value={block.fontFamily} onChange={(e) => set({ fontFamily: e.target.value })}>
            {FONTS.map((f) => (
              <option key={f.family} value={f.family}>{f.label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">粗細</span>
          <select value={block.fontWeight} onChange={(e) => set({ fontWeight: Number(e.target.value) })}>
            {WEIGHTS.map((w) => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
        </label>
        <div className="grid-2">
          <NumberField label="字級" unit="pt" value={block.fontSize} min={2} max={72} step={0.5} onChange={(v) => set({ fontSize: v }, `fs-${block.id}`)} />
          <NumberField label="行高" unit="×" value={block.lineHeight} min={0.8} max={4} step={0.05} digits={2} onChange={(v) => set({ lineHeight: v }, `lh-${block.id}`)} />
          <NumberField label="字距" unit="em" value={block.letterSpacing} min={-0.2} max={1} step={0.01} digits={2} onChange={(v) => set({ letterSpacing: v }, `ls-${block.id}`)} />
        </div>
        <div className="field">
          <span className="field-label">行內對齊</span>
          <div className="seg">
            {[
              ['left', '靠左'],
              ['center', '置中'],
              ['right', '靠右'],
            ].map(([v, l]) => (
              <button key={v} className={block.align === v ? 'on' : ''} onClick={() => set({ align: v })}>{l}</button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h3>顏色</h3>
        <div className="swatches">
          {SWATCHES.map((c) => (
            <button
              key={c}
              className={`swatch${block.color.toLowerCase() === c ? ' on' : ''}`}
              style={{ background: c }}
              title={c}
              onClick={() => set({ color: c })}
            />
          ))}
          <label className="swatch custom" title="自訂顏色">
            <input type="color" value={block.color} onChange={(e) => set({ color: e.target.value }, `color-${block.id}`)} />
          </label>
        </div>
      </section>

      <section>
        <h3>位置（距紙張左上角）</h3>
        <div className="grid-2">
          <NumberField label="X" unit="mm" value={block.x} min={safe.x} max={safe.x + safe.w} onChange={(v) => set({ x: v }, `x-${block.id}`)} />
          <NumberField label="Y" unit="mm" value={block.y} min={safe.y} max={safe.y + safe.h} onChange={(v) => set({ y: v }, `y-${block.id}`)} />
        </div>
        <div className="field">
          <span className="field-label">對齊可編輯範圍</span>
          <div className="seg icons">
            <button title="靠左" onClick={() => onAlignTo('left')}>⇤</button>
            <button title="水平置中" onClick={() => onAlignTo('hcenter')}>↔</button>
            <button title="靠右" onClick={() => onAlignTo('right')}>⇥</button>
            <button title="靠上" onClick={() => onAlignTo('top')}>⤒</button>
            <button title="垂直置中" onClick={() => onAlignTo('vcenter')}>↕</button>
            <button title="靠下" onClick={() => onAlignTo('bottom')}>⤓</button>
          </div>
        </div>
      </section>

      <section className="actions">
        <button onClick={() => onLayer(1)}>上移一層</button>
        <button onClick={() => onLayer(-1)}>下移一層</button>
        <button onClick={onDuplicate}>複製</button>
        <button className="danger" onClick={onDelete}>刪除</button>
      </section>
    </aside>
  );
}
