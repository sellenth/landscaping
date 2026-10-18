import { type Path, flatten, pathBounds } from "../geometry/path";
import { type Bounds, boundsIntersect, unionBounds } from "../geometry/vec";
import type { LandscapeDocument, Material, Shape } from "../model/types";
import type { View } from "../store/editor";
import { drawPattern } from "./patterns";

/** Plans are drawn on "paper" in both UI themes, the way they will print. */
export const PAPER = "#fbfaf6";
export const INK = "#2c312b";
export const SELECT = "#2f74d0";
const GRID_MINOR = "rgba(60, 80, 60, 0.07)";
const GRID_MAJOR = "rgba(60, 80, 60, 0.16)";

const GRID_STEPS = [1, 3, 6, 12, 60, 120, 600, 1200, 6000, 12000];

export function gridSteps(scale: number) {
  const minor = GRID_STEPS.find((s) => s * scale >= 12) ?? GRID_STEPS[GRID_STEPS.length - 1];
  const major = GRID_STEPS.find((s) => s >= minor * 4 && s % minor === 0) ?? minor * 10;
  return { minor, major };
}

const pathCache = new WeakMap<Path, Path2D>();

export function toPath2D(path: Path): Path2D {
  let p2 = pathCache.get(path);
  if (p2) return p2;
  p2 = new Path2D();
  const { nodes, closed } = path;
  if (nodes.length > 0) {
    p2.moveTo(nodes[0].x, nodes[0].y);
    const count = closed ? nodes.length : nodes.length - 1;
    for (let i = 0; i < count; i++) {
      const a = nodes[i];
      const b = nodes[(i + 1) % nodes.length];
      if (!a.out && !b.in) p2.lineTo(b.x, b.y);
      else {
        const c1 = a.out ?? a, c2 = b.in ?? b;
        p2.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b.x, b.y);
      }
    }
    if (closed) p2.closePath();
  }
  pathCache.set(path, p2);
  return p2;
}

const boundsCache = new WeakMap<Path, Bounds>();
export function cachedBounds(path: Path): Bounds {
  let b = boundsCache.get(path);
  if (!b) boundsCache.set(path, (b = pathBounds(path)));
  return b;
}

const imageCache = new Map<string, HTMLImageElement>();
function getImage(src: string, onLoad: () => void): HTMLImageElement | null {
  let img = imageCache.get(src);
  if (!img) {
    img = new Image();
    img.onload = onLoad;
    img.src = src;
    imageCache.set(src, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}

export function viewWorldBounds(view: View, width: number, height: number): Bounds {
  return {
    minX: -view.ox / view.scale,
    minY: -view.oy / view.scale,
    maxX: (width - view.ox) / view.scale,
    maxY: (height - view.oy) / view.scale,
  };
}

export interface RenderInput {
  doc: LandscapeDocument;
  view: View;
  selection: string[];
  width: number;
  height: number;
  dpr: number;
  showGrid: boolean;
  /** Called when an underlay image finishes loading and the canvas should redraw. */
  requestRender: () => void;
}

export function renderScene(ctx: CanvasRenderingContext2D, input: RenderInput) {
  const { doc, view, width, height, dpr } = input;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);
  if (input.showGrid) drawGrid(ctx, view, width, height);

  const visible = viewWorldBounds(view, width, height);
  ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.ox, dpr * view.oy);
  const px = 1 / view.scale;

  for (const u of doc.underlays) {
    const img = getImage(u.src, input.requestRender);
    if (!img) continue;
    ctx.globalAlpha = u.opacity;
    ctx.drawImage(img, u.x, u.y, u.width, u.height);
    ctx.globalAlpha = 1;
  }

  const materials = new Map(doc.materials.map((m) => [m.id, m]));
  const hiddenLayers = new Set(doc.layers.filter((l) => !l.visible).map((l) => l.id));
  const layerOrder = new Map(doc.layers.map((l, i) => [l.id, i]));
  const shapes = doc.objects
    .filter((s) => !hiddenLayers.has(s.layerId))
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (layerOrder.get(a.s.layerId)! - layerOrder.get(b.s.layerId)!) || a.i - b.i)
    .map((x) => x.s);

  for (const shape of shapes) {
    const b = cachedBounds(shape.path);
    if (!boundsIntersect(b, visible)) continue;
    drawShape(ctx, shape, materials.get(shape.materialId ?? ""), b, visible, view.scale, px);
  }

  // Selection outlines
  const selected = new Set(input.selection);
  ctx.lineWidth = 2 * px;
  ctx.strokeStyle = SELECT;
  let selBounds: Bounds | null = null;
  for (const shape of doc.objects) {
    if (!selected.has(shape.id)) continue;
    ctx.stroke(toPath2D(shape.path));
    const b = cachedBounds(shape.path);
    selBounds = selBounds ? unionBounds(selBounds, b) : b;
  }
  for (const u of doc.underlays) {
    if (!selected.has(u.id)) continue;
    ctx.strokeRect(u.x, u.y, u.width, u.height);
  }
  if (selBounds && selected.size > 1) {
    ctx.setLineDash([4 * px, 4 * px]);
    ctx.lineWidth = 1 * px;
    ctx.strokeRect(selBounds.minX, selBounds.minY, selBounds.maxX - selBounds.minX, selBounds.maxY - selBounds.minY);
    ctx.setLineDash([]);
  }
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  material: Material | undefined,
  b: Bounds,
  visible: Bounds,
  scale: number,
  px: number,
) {
  const p2 = toPath2D(shape.path);
  if (shape.path.closed && material) {
    ctx.save();
    ctx.clip(p2);
    const clipB = {
      minX: Math.max(b.minX, visible.minX),
      minY: Math.max(b.minY, visible.minY),
      maxX: Math.min(b.maxX, visible.maxX),
      maxY: Math.min(b.maxY, visible.maxY),
    };
    drawPattern(ctx, material, clipB, material.patternAngle + shape.patternAngle, scale);
    ctx.restore();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = (material ? 1.25 : 1.5) * px;
  ctx.lineJoin = "round";
  ctx.stroke(p2);
}

function drawGrid(ctx: CanvasRenderingContext2D, view: View, width: number, height: number) {
  const { minor, major } = gridSteps(view.scale);
  const lines = (step: number, color: string) => {
    const spacing = step * view.scale;
    if (spacing < 6) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const startX = ((view.ox % spacing) + spacing) % spacing;
    for (let x = startX; x < width; x += spacing) {
      const sx = Math.round(x) + 0.5;
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
    }
    const startY = ((view.oy % spacing) + spacing) % spacing;
    for (let y = startY; y < height; y += spacing) {
      const sy = Math.round(y) + 0.5;
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
    }
    ctx.stroke();
  };
  lines(minor, GRID_MINOR);
  lines(major, GRID_MAJOR);
}

/** Polyline of a shape for hit-testing, cached per path. */
const polyCache = new WeakMap<Path, { x: number; y: number }[]>();
export function cachedPolyline(path: Path) {
  let p = polyCache.get(path);
  if (!p) polyCache.set(path, (p = flatten(path, 1)));
  return p;
}
