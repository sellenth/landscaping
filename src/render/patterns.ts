// Real-scale material patterns. Everything is drawn in model units (inches),
// so a 4×8 paver is 4×8 at every zoom level. Patterns are anchored to the
// world origin, so neighbouring shapes of the same material line up.

import type { Bounds } from "../geometry/vec";
import type { Material } from "../model/types";

/** Below this on-screen size (px), pattern detail is skipped and only the fill color is drawn. */
const MIN_DETAIL_PX = 2.5;
/** Hard cap on pattern cells per shape per frame, to keep huge zoomed-out areas fast. */
const MAX_CELLS = 40000;

function hash(ix: number, iy: number, k = 0): number {
  let h = (ix * 374761393 + iy * 668265263 + k * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function rotatedBounds(b: Bounds, angleRad: number): Bounds {
  // Bounds of b in a frame rotated by angleRad (i.e. inverse-rotate the corners).
  const c = Math.cos(-angleRad), s = Math.sin(-angleRad);
  const corners = [
    [b.minX, b.minY], [b.maxX, b.minY], [b.maxX, b.maxY], [b.minX, b.maxY],
  ].map(([x, y]) => [x * c - y * s, x * s + y * c]);
  return {
    minX: Math.min(...corners.map((p) => p[0])),
    maxX: Math.max(...corners.map((p) => p[0])),
    minY: Math.min(...corners.map((p) => p[1])),
    maxY: Math.max(...corners.map((p) => p[1])),
  };
}

function cellRange(b: Bounds, w: number, h: number) {
  const x0 = Math.floor(b.minX / w) - 1, x1 = Math.ceil(b.maxX / w) + 1;
  const y0 = Math.floor(b.minY / h) - 1, y1 = Math.ceil(b.maxY / h) + 1;
  return { x0, x1, y0, y1, count: (x1 - x0) * (y1 - y0) };
}

/** Characteristic size of one pattern element, in inches. */
function featureSize(m: Material): number {
  const p = m.pattern;
  switch (p.kind) {
    case "solid": return Infinity;
    case "runningBond":
    case "stackBond":
    case "herringbone": return p.width;
    case "flagstone": return p.size;
    case "gravel": return p.size * 2.4;
    case "riverRock": return p.size;
    case "lawn":
    case "mulch":
    case "water": return p.spacing;
    case "boards": return p.width;
    case "concrete": return p.joint / 4;
  }
}

/**
 * Fills the current path (already clipped by the caller) with the material's
 * pattern. `visible` is the part of the shape on screen, in world units.
 */
export function drawPattern(
  ctx: CanvasRenderingContext2D,
  m: Material,
  visible: Bounds,
  angleDeg: number,
  pxPerInch: number,
) {
  ctx.fillStyle = m.color;
  ctx.fillRect(visible.minX, visible.minY, visible.maxX - visible.minX, visible.maxY - visible.minY);
  if (featureSize(m) * pxPerInch < MIN_DETAIL_PX) return;

  const angle = (angleDeg * Math.PI) / 180;
  const b = rotatedBounds(visible, angle);
  const px = 1 / pxPerInch;
  ctx.save();
  ctx.rotate(angle);
  ctx.strokeStyle = m.lineColor;
  ctx.fillStyle = m.lineColor;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const p = m.pattern;

  switch (p.kind) {
    case "runningBond":
    case "stackBond": {
      const { length: L, width: W } = p;
      const r = cellRange(b, L, W);
      if (r.count > MAX_CELLS) break;
      ctx.lineWidth = Math.max(0.75 * px, W * 0.04);
      ctx.beginPath();
      for (let j = r.y0; j <= r.y1; j++) {
        const y = j * W;
        ctx.moveTo(b.minX - L, y);
        ctx.lineTo(b.maxX + L, y);
        const shift = p.kind === "runningBond" && j % 2 !== 0 ? L / 2 : 0;
        for (let i = r.x0; i <= r.x1; i++) {
          const x = i * L + shift;
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + W);
        }
      }
      ctx.stroke();
      break;
    }

    case "herringbone": {
      // 90° herringbone from L×W bricks (L = 2W), laid on the lattice
      // k·(W, W) + m·(2W, −2W). The material's 45° angle turns it into the
      // classic 45° pattern.
      const W = p.width;
      const L = p.length;
      const ks = [b.minX + b.minY, b.maxX + b.maxY, b.minX + b.maxY, b.maxX + b.minY].map((v) => v / (2 * W));
      const ms = [b.minX - b.minY, b.maxX - b.maxY, b.minX - b.maxY, b.maxX - b.minY].map((v) => v / (4 * W));
      const k0 = Math.floor(Math.min(...ks)) - 3, k1 = Math.ceil(Math.max(...ks)) + 3;
      const m0 = Math.floor(Math.min(...ms)) - 2, m1 = Math.ceil(Math.max(...ms)) + 2;
      if ((k1 - k0) * (m1 - m0) > MAX_CELLS) break;
      ctx.lineWidth = Math.max(0.75 * px, W * 0.05);
      ctx.beginPath();
      for (let k = k0; k <= k1; k++) {
        for (let mm = m0; mm <= m1; mm++) {
          const x = W * (k + 2 * mm);
          const y = W * (k - 2 * mm);
          if (x > b.maxX + L || x < b.minX - 2 * L || y > b.maxY + L || y < b.minY - 2 * L) continue;
          ctx.rect(x, y, L, W);
          ctx.rect(x, y + W, W, L);
        }
      }
      ctx.stroke();
      break;
    }

    case "flagstone": {
      const s = p.size;
      const r = cellRange(b, s, s);
      if (r.count > MAX_CELLS) break;
      const v = (i: number, j: number) => ({
        x: i * s + (hash(i, j, 1) - 0.5) * 0.6 * s,
        y: j * s + (hash(i, j, 2) - 0.5) * 0.6 * s,
      });
      ctx.lineWidth = Math.max(1 * px, s * 0.07);
      for (let j = r.y0; j <= r.y1; j++) {
        for (let i = r.x0; i <= r.x1; i++) {
          const a = v(i, j), bb = v(i + 1, j), c = v(i + 1, j + 1), d = v(i, j + 1);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(bb.x, bb.y);
          ctx.lineTo(c.x, c.y);
          ctx.lineTo(d.x, d.y);
          ctx.closePath();
          const tone = hash(i, j, 3);
          ctx.fillStyle = tone > 0.5 ? `rgba(255,255,255,${(tone - 0.5) * 0.35})` : `rgba(60,40,20,${(0.5 - tone) * 0.22})`;
          ctx.fill();
          ctx.stroke();
        }
      }
      break;
    }

    case "gravel": {
      const cell = p.size * 2.4;
      const r = cellRange(b, cell, cell);
      if (r.count > MAX_CELLS) break;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      for (let j = r.y0; j <= r.y1; j++) {
        for (let i = r.x0; i <= r.x1; i++) {
          for (let k = 0; k < 2; k++) {
            const x = (i + hash(i, j, k * 2)) * cell;
            const y = (j + hash(i, j, k * 2 + 1)) * cell;
            const rad = p.size * (0.22 + hash(i, j, k + 7) * 0.2);
            ctx.moveTo(x + rad, y);
            ctx.arc(x, y, rad, 0, Math.PI * 2);
          }
        }
      }
      ctx.fill();
      ctx.globalAlpha = 1;
      break;
    }

    case "riverRock": {
      const cell = p.size * 1.25;
      const r = cellRange(b, cell, cell);
      if (r.count > MAX_CELLS) break;
      ctx.lineWidth = Math.max(0.75 * px, p.size * 0.06);
      for (let j = r.y0; j <= r.y1; j++) {
        for (let i = r.x0; i <= r.x1; i++) {
          const x = (i + 0.5 + (hash(i, j, 1) - 0.5) * 0.3) * cell;
          const y = (j + 0.5 + (hash(i, j, 2) - 0.5) * 0.3) * cell;
          const rx = p.size * (0.35 + hash(i, j, 3) * 0.15);
          const ry = rx * (0.6 + hash(i, j, 4) * 0.35);
          ctx.beginPath();
          ctx.ellipse(x, y, rx, ry, hash(i, j, 5) * Math.PI, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${0.15 + hash(i, j, 6) * 0.3})`;
          ctx.fill();
          ctx.stroke();
        }
      }
      break;
    }

    case "lawn": {
      const s = p.spacing;
      const r = cellRange(b, s, s);
      if (r.count > MAX_CELLS) break;
      ctx.lineWidth = Math.max(0.75 * px, s * 0.08);
      ctx.beginPath();
      for (let j = r.y0; j <= r.y1; j++) {
        for (let i = r.x0; i <= r.x1; i++) {
          if (hash(i, j, 9) < 0.35) continue;
          const x = (i + hash(i, j, 1)) * s;
          const y = (j + hash(i, j, 2)) * s;
          const h = s * 0.45;
          const lean = (hash(i, j, 3) - 0.5) * h * 0.6;
          ctx.moveTo(x - h * 0.25, y);
          ctx.lineTo(x + lean, y - h);
          ctx.moveTo(x + h * 0.25, y);
          ctx.lineTo(x + lean * 0.5 + h * 0.3, y - h * 0.8);
        }
      }
      ctx.stroke();
      break;
    }

    case "mulch": {
      const s = p.spacing;
      const r = cellRange(b, s, s);
      if (r.count > MAX_CELLS) break;
      ctx.lineWidth = Math.max(0.75 * px, s * 0.12);
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      for (let j = r.y0; j <= r.y1; j++) {
        for (let i = r.x0; i <= r.x1; i++) {
          const x = (i + hash(i, j, 1)) * s;
          const y = (j + hash(i, j, 2)) * s;
          const a = hash(i, j, 3) * Math.PI;
          const l = s * (0.25 + hash(i, j, 4) * 0.3);
          ctx.moveTo(x - Math.cos(a) * l, y - Math.sin(a) * l);
          ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        }
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }

    case "boards": {
      const { width: W, length: L } = p;
      const r = cellRange(b, L, W);
      if (r.count > MAX_CELLS * 4) break;
      ctx.lineWidth = Math.max(0.75 * px, W * 0.05);
      ctx.beginPath();
      for (let j = r.y0; j <= r.y1; j++) {
        const y = j * W;
        ctx.moveTo(b.minX - L, y);
        ctx.lineTo(b.maxX + L, y);
        const shift = hash(0, j, 1) * L;
        for (let i = r.x0; i <= r.x1; i++) {
          const x = i * L + shift;
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + W);
        }
      }
      ctx.stroke();
      break;
    }

    case "concrete": {
      const J = p.joint;
      const dotCell = 5;
      const rDots = cellRange(b, dotCell, dotCell);
      if (rDots.count < MAX_CELLS && dotCell * pxPerInch > 3) {
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        for (let j = rDots.y0; j <= rDots.y1; j++) {
          for (let i = rDots.x0; i <= rDots.x1; i++) {
            if (hash(i, j, 1) > 0.4) continue;
            const x = (i + hash(i, j, 2)) * dotCell;
            const y = (j + hash(i, j, 3)) * dotCell;
            ctx.moveTo(x + 0.35, y);
            ctx.arc(x, y, 0.35, 0, Math.PI * 2);
          }
        }
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      const r = cellRange(b, J, J);
      ctx.lineWidth = 1.25 * px;
      ctx.beginPath();
      for (let j = r.y0; j <= r.y1; j++) {
        ctx.moveTo(b.minX - J, j * J);
        ctx.lineTo(b.maxX + J, j * J);
      }
      for (let i = r.x0; i <= r.x1; i++) {
        ctx.moveTo(i * J, b.minY - J);
        ctx.lineTo(i * J, b.maxY + J);
      }
      ctx.stroke();
      break;
    }

    case "water": {
      const s = p.spacing;
      const r = cellRange(b, s * 2.5, s);
      if (r.count > MAX_CELLS) break;
      ctx.lineWidth = Math.max(1 * px, s * 0.06);
      ctx.beginPath();
      for (let j = r.y0; j <= r.y1; j++) {
        for (let i = r.x0; i <= r.x1; i++) {
          if (hash(i, j, 1) < 0.45) continue;
          const x = (i + hash(i, j, 2) * 0.5) * s * 2.5;
          const y = (j + hash(i, j, 3) * 0.6) * s;
          const w = s * (0.8 + hash(i, j, 4) * 0.6);
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + w / 4, y - s * 0.18, x + w / 2, y);
          ctx.quadraticCurveTo(x + (3 * w) / 4, y + s * 0.18, x + w, y);
        }
      }
      ctx.stroke();
      break;
    }

    case "solid":
      break;
  }
  ctx.restore();
}
