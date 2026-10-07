import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CARD_SIZE, PT_TO_MM, clamp } from '../lib/units';
import { fontStack } from '../lib/fonts';
import { snapRect, buildTargets } from '../lib/snap';

const SNAP_PX = 6;
const STAGE_PADDING = 56;

export default function Stage({
  doc,
  layouts,
  selectedId,
  settings,
  zoom, // 'fit' 或 px/mm
  onScaleChange,
  onSelect,
  onDragStart,
  onMove,
  onEditRequest,
}) {
  const wrapRef = useRef(null);
  const [fitScale, setFitScale] = useState(4);
  const [guides, setGuides] = useState(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    const ro = new ResizeObserver(() => {
      const { clientWidth: w, clientHeight: h } = el;
      setFitScale(Math.max(1, (Math.min(w, h) - STAGE_PADDING * 2) / CARD_SIZE));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const s = zoom === 'fit' ? fitScale : zoom;
  useEffect(() => onScaleChange?.(s), [s, onScaleChange]);

  const { safe } = doc;

  const startDrag = (e, b) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect(b.id);
    const L = layouts[b.id];
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const start = { cx: e.clientX, cy: e.clientY, x: b.x, y: b.y };
    const others = doc.blocks
      .filter((o) => o.id !== b.id && layouts[o.id])
      .map((o) => ({ x: o.x, y: o.y, w: layouts[o.id].width, h: layouts[o.id].height }));
    const targets = buildTargets(safe, others);
    let moved = false;

    const move = (ev) => {
      if (!moved) {
        if (Math.hypot(ev.clientX - start.cx, ev.clientY - start.cy) < 3) return;
        moved = true;
        onDragStart();
      }
      let x = start.x + (ev.clientX - start.cx) / s;
      let y = start.y + (ev.clientY - start.cy) / s;
      let g = null;
      // 按住 Alt/Option 可暫時關閉貼齊
      if (!ev.altKey) {
        const r = snapRect({ x, y, w: L.width, h: L.height }, targets, SNAP_PX / s);
        x += r.dx;
        y += r.dy;
        g = r.guides;
      }
      // 限制在可自訂範圍內
      x = clamp(x, safe.x, Math.max(safe.x, safe.x + safe.w - L.width));
      y = clamp(y, safe.y, Math.max(safe.y, safe.y + safe.h - L.height));
      setGuides(g);
      onMove(b.id, x, y);
    };
    const end = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointercancel', end);
      setGuides(null);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  };

  return (
    <div
      className="stage"
      ref={wrapRef}
      onPointerDown={(e) => {
        if (!e.target.closest('.block')) onSelect(null);
      }}
    >
      <div className="card-outer" style={{ width: CARD_SIZE * s, height: CARD_SIZE * s }}>
        <Rulers s={s} />
        <div className="card" style={{ background: settings.paperColor }}>
          {settings.showBg && settings.bgSrc && (
            <img className="card-bg" src={settings.bgSrc} alt="" style={{ opacity: settings.bgOpacity }} draggable={false} />
          )}

          {settings.showSafe && (
            <div
              className="safe-area"
              style={{ left: safe.x * s, top: safe.y * s, width: safe.w * s, height: safe.h * s }}
            >
              <span className="safe-label">
                可編輯範圍 {safe.w} × {safe.h} mm
              </span>
            </div>
          )}

          {doc.blocks.map((b) => {
            const L = layouts[b.id];
            if (!L) return null;
            const out =
              L.width > safe.w + 0.01 ||
              L.height > safe.h + 0.01 ||
              b.x < safe.x - 0.01 ||
              b.y < safe.y - 0.01 ||
              b.x + L.width > safe.x + safe.w + 0.01 ||
              b.y + L.height > safe.y + safe.h + 0.01;
            const em = b.fontSize * PT_TO_MM * s;
            return (
              <div
                key={b.id}
                className={`block${b.id === selectedId ? ' selected' : ''}${out ? ' overflow' : ''}`}
                style={{ left: b.x * s, top: b.y * s, width: L.width * s, height: L.height * s }}
                onPointerDown={(e) => startDrag(e, b)}
                onDoubleClick={() => onEditRequest(b.id)}
              >
                {L.lines.map((ln, i) => (
                  <div
                    key={i}
                    className="line"
                    style={{
                      left: ln.dx * s,
                      top: i * L.lineHeight * s,
                      height: L.lineHeight * s,
                      lineHeight: `${L.lineHeight * s}px`,
                      fontFamily: fontStack(b.fontFamily),
                      fontWeight: b.fontWeight,
                      fontSize: em,
                      letterSpacing: L.letterSpacing * s,
                      color: b.color,
                    }}
                  >
                    {ln.text}
                  </div>
                ))}
                {out && <span className="overflow-badge">超出範圍</span>}
              </div>
            );
          })}

          {guides?.v.map((x) => (
            <div key={`v${x}`} className="guide guide-v" style={{ left: x * s }} />
          ))}
          {guides?.h.map((y) => (
            <div key={`h${y}`} className="guide guide-h" style={{ top: y * s }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Rulers({ s }) {
  const ticks = [];
  for (let mm = 0; mm <= CARD_SIZE; mm += 5) ticks.push(mm);
  return (
    <>
      <div className="ruler ruler-top">
        {ticks.map((mm) => (
          <span key={mm} className={mm % 10 === 0 ? 'major' : ''} style={{ left: mm * s }}>
            {mm % 20 === 0 && <em>{mm}</em>}
          </span>
        ))}
      </div>
      <div className="ruler ruler-left">
        {ticks.map((mm) => (
          <span key={mm} className={mm % 10 === 0 ? 'major' : ''} style={{ top: mm * s }}>
            {mm % 20 === 0 && <em>{mm}</em>}
          </span>
        ))}
      </div>
    </>
  );
}
