import { useCallback, useRef, useState } from 'react';

const LIMIT = 100;
const COALESCE_MS = 800;

/**
 * 簡易 undo/redo。
 * update(fn, mode)：
 *  - mode 省略：每次變更都成為一個步驟
 *  - mode = 'replace'：直接覆寫目前狀態（拖曳過程中使用，搭配 checkpoint）
 *  - mode = 任意字串：相同 key 在短時間內連續變更會合併成一個步驟（例如打字）
 */
export function useHistory(init) {
  const [hist, setHist] = useState(() => ({ past: [], present: init(), future: [] }));
  const last = useRef({ key: null, time: 0 });

  const update = useCallback((fn, mode) => {
    const now = Date.now();
    const coalesce =
      mode === 'replace' ||
      (typeof mode === 'string' && mode === last.current.key && now - last.current.time < COALESCE_MS);
    last.current = { key: mode === 'replace' ? last.current.key : mode ?? null, time: now };

    setHist((h) => {
      const next = typeof fn === 'function' ? fn(h.present) : fn;
      if (next === h.present) return h;
      return {
        past: coalesce ? h.past : [...h.past.slice(-LIMIT + 1), h.present],
        present: next,
        future: [],
      };
    });
  }, []);

  const checkpoint = useCallback(() => {
    last.current = { key: null, time: 0 };
    setHist((h) => ({ past: [...h.past.slice(-LIMIT + 1), h.present], present: h.present, future: [] }));
  }, []);

  const undo = useCallback(() => {
    last.current = { key: null, time: 0 };
    setHist((h) =>
      h.past.length
        ? { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] }
        : h,
    );
  }, []);

  const redo = useCallback(() => {
    last.current = { key: null, time: 0 };
    setHist((h) =>
      h.future.length
        ? { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }
        : h,
    );
  }, []);

  return {
    doc: hist.present,
    update,
    checkpoint,
    undo,
    redo,
    canUndo: hist.past.length > 0,
    canRedo: hist.future.length > 0,
  };
}
