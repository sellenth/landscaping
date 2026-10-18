import { useEffect, useRef, useState } from "react";
import type { Material } from "../model/types";
import { formatLength, parseLength } from "../model/units";
import { drawPattern } from "../render/patterns";

/**
 * A text field for lengths. Shows feet-and-inches, accepts anything
 * parseLength understands, and commits on Enter or blur.
 */
export function LengthField({
  id,
  value,
  onCommit,
  bareUnit = "ft",
  format = formatLength,
}: {
  id: string;
  value: number;
  onCommit: (inches: number) => void;
  bareUnit?: "ft" | "in";
  format?: (inches: number) => string;
}) {
  const [text, setText] = useState(format(value));
  const [invalid, setInvalid] = useState(false);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(format(value));
  }, [value, format]);

  const commit = () => {
    const v = parseLength(text, bareUnit);
    if (v === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (Math.abs(v - value) > 1e-9) onCommit(v);
    setText(format(v));
  };

  return (
    <input
      id={id}
      className={`field${invalid ? " invalid" : ""}`}
      value={text}
      aria-invalid={invalid}
      onFocus={(e) => {
        focused.current = true;
        e.target.select();
      }}
      onBlur={() => {
        focused.current = false;
        commit();
      }}
      onChange={(e) => {
        setText(e.target.value);
        setInvalid(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setText(format(value));
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

/** A number field that commits on Enter or blur. */
export function NumberField({
  id,
  value,
  onCommit,
  step = 1,
  min,
  prefix,
  suffix,
}: {
  id: string;
  value: number;
  onCommit: (v: number) => void;
  step?: number;
  min?: number;
  prefix?: string;
  suffix?: string;
}) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);
  const commit = () => {
    const v = Number(text);
    if (text.trim() === "" || !Number.isFinite(v) || (min !== undefined && v < min)) {
      setText(String(value));
      return;
    }
    if (v !== value) onCommit(v);
  };
  return (
    <span className="number-field">
      {prefix && <span className="affix">{prefix}</span>}
      <input
        id={id}
        className="field"
        type="number"
        step={step}
        min={min}
        value={text}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          commit();
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
      {suffix && <span className="affix">{suffix}</span>}
    </span>
  );
}

/** A small live preview of a material's plan pattern. */
export function MaterialSwatch({ material, size = 32 }: { material: Material | null; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = size * dpr;
    c.height = size * dpr;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    if (!material) {
      ctx.fillStyle = "#fbfaf6";
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = "#2c312b";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(5.5, 5.5, size - 11, size - 11);
      return;
    }
    // Show roughly 2 ft of material so patterns read at swatch size.
    const pxPerInch = Math.max(1.1, size / 26);
    ctx.save();
    ctx.scale(pxPerInch, pxPerInch);
    ctx.beginPath();
    ctx.rect(0, 0, size / pxPerInch, size / pxPerInch);
    ctx.clip();
    drawPattern(ctx, material, { minX: 0, minY: 0, maxX: size / pxPerInch, maxY: size / pxPerInch }, material.patternAngle, pxPerInch);
    ctx.restore();
  }, [material, size]);
  return <canvas ref={ref} className="swatch" style={{ width: size, height: size }} aria-hidden="true" />;
}
