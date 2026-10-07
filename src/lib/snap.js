/**
 * 拖曳貼齊：比對移動中區塊的 左/中/右、上/中/下 與目標線，
 * 在門檻內就吸附，並回傳要顯示的參考線。
 */
export function snapRect(rect, targets, threshold) {
  const xs = [rect.x, rect.x + rect.w / 2, rect.x + rect.w];
  const ys = [rect.y, rect.y + rect.h / 2, rect.y + rect.h];

  const best = (edges, lines) => {
    let hit = null;
    for (const e of edges) {
      for (const t of lines) {
        const d = t - e;
        if (Math.abs(d) <= threshold && (!hit || Math.abs(d) < Math.abs(hit.d))) hit = { d, t };
      }
    }
    return hit;
  };

  const hx = best(xs, targets.x);
  const hy = best(ys, targets.y);
  const dx = hx ? hx.d : 0;
  const dy = hy ? hy.d : 0;

  // 吸附後，所有剛好對齊的線都顯示出來
  const snapped = { x: rect.x + dx, y: rect.y + dy };
  const eps = 0.01;
  const sx = [snapped.x, snapped.x + rect.w / 2, snapped.x + rect.w];
  const sy = [snapped.y, snapped.y + rect.h / 2, snapped.y + rect.h];
  const v = hx ? [...new Set(targets.x.filter((t) => sx.some((e) => Math.abs(e - t) < eps)))] : [];
  const h = hy ? [...new Set(targets.y.filter((t) => sy.some((e) => Math.abs(e - t) < eps)))] : [];

  return { dx, dy, guides: { v, h } };
}

export function buildTargets(safe, others) {
  const x = [safe.x, safe.x + safe.w / 2, safe.x + safe.w];
  const y = [safe.y, safe.y + safe.h / 2, safe.y + safe.h];
  for (const r of others) {
    x.push(r.x, r.x + r.w / 2, r.x + r.w);
    y.push(r.y, r.y + r.h / 2, r.y + r.h);
  }
  return { x, y };
}
