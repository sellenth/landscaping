import { distanceToPath, pointInPolygon } from "../geometry/path";
import type { Vec } from "../geometry/vec";
import type { LandscapeDocument } from "../model/types";
import { cachedBounds, cachedPolyline, gridSteps } from "../render/renderer";
import type { Editor, View } from "../store/editor";

export interface PointerInfo {
  world: Vec;
  screen: Vec;
  shift: boolean;
  alt: boolean;
  mod: boolean;
  button: number;
  clickCount: number;
}

export interface SnapResult {
  point: Vec;
  kind: "node" | "grid" | null;
}

export interface ToolHost {
  editor: Editor;
  view(): View;
  toScreen(world: Vec): Vec;
  toWorld(screen: Vec): Vec;
  requestRender(): void;
  /** Snaps a world point to nearby nodes or the grid, per the user's snap settings. */
  snap(world: Vec, opts?: { exclude?: Set<string>; bypass?: boolean }): SnapResult;
  setSnapIndicator(s: SnapResult | null): void;
}

export interface Tool {
  cursor: string;
  onDown?(p: PointerInfo, host: ToolHost): void;
  onMove?(p: PointerInfo, host: ToolHost): void;
  onUp?(p: PointerInfo, host: ToolHost): void;
  /** Returns true if the key was handled. */
  onKey?(e: KeyboardEvent, host: ToolHost): boolean;
  onDeactivate?(host: ToolHost): void;
  /** Draws previews in screen space (CSS pixels). */
  drawOverlay?(ctx: CanvasRenderingContext2D, host: ToolHost): void;
}

const SNAP_PX = 9;

export function snapPoint(
  doc: LandscapeDocument,
  view: View,
  world: Vec,
  opts: { toGrid: boolean; toPoints: boolean; exclude?: Set<string> },
): SnapResult {
  if (opts.toPoints) {
    const tol = SNAP_PX / view.scale;
    let best: Vec | null = null;
    let bestD = tol;
    const hidden = new Set(doc.layers.filter((l) => !l.visible).map((l) => l.id));
    for (const s of doc.objects) {
      if (hidden.has(s.layerId) || opts.exclude?.has(s.id)) continue;
      const b = cachedBounds(s.path);
      if (world.x < b.minX - tol || world.x > b.maxX + tol || world.y < b.minY - tol || world.y > b.maxY + tol) continue;
      for (const n of s.path.nodes) {
        const d = Math.hypot(n.x - world.x, n.y - world.y);
        if (d < bestD) {
          bestD = d;
          best = { x: n.x, y: n.y };
        }
      }
    }
    if (best) return { point: best, kind: "node" };
  }
  if (opts.toGrid) {
    const { minor } = gridSteps(view.scale);
    return { point: { x: Math.round(world.x / minor) * minor, y: Math.round(world.y / minor) * minor }, kind: "grid" };
  }
  return { point: world, kind: null };
}

/** Topmost selectable object under the point, or null. */
export function hitTest(doc: LandscapeDocument, world: Vec, scale: number): string | null {
  const tol = 6 / scale;
  const blocked = new Set(doc.layers.filter((l) => !l.visible || l.locked).map((l) => l.id));
  const layerOrder = new Map(doc.layers.map((l, i) => [l.id, i]));
  const ordered = doc.objects
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (layerOrder.get(b.s.layerId)! - layerOrder.get(a.s.layerId)!) || b.i - a.i);
  for (const { s } of ordered) {
    if (blocked.has(s.layerId)) continue;
    const b = cachedBounds(s.path);
    if (world.x < b.minX - tol || world.x > b.maxX + tol || world.y < b.minY - tol || world.y > b.maxY + tol) continue;
    if (s.path.closed && s.materialId && pointInPolygon(world, cachedPolyline(s.path))) return s.id;
    if (distanceToPath(world, s.path) <= tol) return s.id;
  }
  for (let i = doc.underlays.length - 1; i >= 0; i--) {
    const u = doc.underlays[i];
    if (u.locked) continue;
    if (world.x >= u.x && world.x <= u.x + u.width && world.y >= u.y && world.y <= u.y + u.height) return u.id;
  }
  return null;
}

// ---- Shared overlay helpers (screen space) ----

export const OVERLAY_COLOR = "#2f74d0";

export function drawLabel(ctx: CanvasRenderingContext2D, text: string, at: Vec) {
  ctx.font = "600 12px 'Instrument Sans', system-ui, sans-serif";
  const w = ctx.measureText(text).width + 10;
  const x = at.x + 12, y = at.y + 14;
  ctx.fillStyle = "rgba(29, 42, 34, 0.88)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, 20, 4);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText(text, x + 5, y + 14);
}

export function strokeScreenPolyline(ctx: CanvasRenderingContext2D, pts: Vec[], close = false) {
  if (pts.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
  if (close) ctx.closePath();
  ctx.stroke();
}

/** Characters accepted while typing a dimension. */
export const DIMENSION_CHARS = /^[0-9.'"\-/ ftinmcyd’”]$/i;
