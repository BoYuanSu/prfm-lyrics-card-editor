import { useEffect, useRef, useState } from 'react';

// 輸入中保留使用者的原始字串（例如 "0.0"），只有失焦時才依外部值重新格式化
export default function NumberField({ label, value, onChange, step = 0.1, min, max, unit, digits = 1 }) {
  const fmt = (v) => (Number.isFinite(v) ? String(Number(v.toFixed(digits))) : '');
  const [draft, setDraft] = useState(fmt(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(fmt(value));
  }, [value]);

  const apply = (raw) => {
    let n = parseFloat(raw);
    if (!Number.isFinite(n)) return;
    if (min != null) n = Math.max(min, n);
    if (max != null) n = Math.min(max, n);
    if (n !== value) onChange(n);
  };

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="number-input">
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          value={draft}
          onFocus={() => (focused.current = true)}
          onChange={(e) => {
            setDraft(e.target.value);
            apply(e.target.value);
          }}
          onBlur={() => {
            focused.current = false;
            setDraft(fmt(value));
          }}
        />
        {unit && <span className="unit">{unit}</span>}
      </span>
    </label>
  );
}
