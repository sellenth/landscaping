import { type Vec, dist } from "../geometry/vec";
import { formatLength, parseLength } from "../model/units";
import { DimensionInput, createShape } from "./drawing";
import { OVERLAY_COLOR, type PointerInfo, type Tool, type ToolHost, drawLabel } from "./tool";

const CLOSE_PX = 10;

let points: Vec[] = [];
let cursor: Vec | null = null;
let shift = false;
const input = new DimensionInput(["Length"], "Click to add points · type a length + Enter · click the first point to close · Enter to finish");

function constrained(from: Vec, to: Vec, on: boolean): Vec {
  if (!on) return to;
  const step = Math.PI / 12; // 15°
  const a = Math.round(Math.atan2(to.y - from.y, to.x - from.x) / step) * step;
  const d = dist(from, to);
  return { x: from.x + Math.cos(a) * d, y: from.y + Math.sin(a) * d };
}

function nextPoint(): Vec | null {
  if (!cursor) return null;
  const last = points[points.length - 1];
  if (!last) return cursor;
  const target = constrained(last, cursor, shift);
  const typed = parseLength(input.values[0]);
  if (typed === null) return target;
  const d = dist(last, target) || 1;
  const dir = d === 0 ? { x: 1, y: 0 } : { x: (target.x - last.x) / d, y: (target.y - last.y) / d };
  return { x: last.x + dir.x * typed, y: last.y + dir.y * typed };
}

function angleText(a: Vec, b: Vec) {
  // Compass-style bearing: 0° is east, measured counter-clockwise like a protractor on the plan.
  const deg = ((-Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 360) % 360;
  return `${deg.toFixed(0)}°`;
}

function updateHud(host: ToolHost) {
  if (points.length === 0) {
    host.editor.set({ hud: null });
    return;
  }
  const n = nextPoint();
  const last = points[points.length - 1];
  host.editor.set({ hud: input.hud([n ? `${formatLength(dist(last, n))} at ${angleText(last, n)}` : ""]) });
}

function finish(host: ToolHost, closed: boolean) {
  const pts = points;
  reset(host);
  if (pts.length < (closed ? 3 : 2)) return;
  createShape(host, { closed, nodes: pts.map((p) => ({ x: p.x, y: p.y })) }, closed ? "Polygon" : "Line");
}

function reset(host: ToolHost) {
  points = [];
  input.reset();
  host.editor.set({ hud: null });
  host.setSnapIndicator(null);
  host.requestRender();
}

function addPoint(p: Vec, host: ToolHost) {
  points = [...points, p];
  input.reset();
  updateHud(host);
  host.requestRender();
}

function track(p: PointerInfo, host: ToolHost): Vec {
  const snapped = host.snap(p.world, { bypass: p.mod });
  host.setSnapIndicator(snapped.kind ? snapped : null);
  shift = p.shift;
  return snapped.kind ? snapped.point : p.world;
}

export const polygonTool: Tool = {
  cursor: "crosshair",
  onDown(p, host) {
    if (p.button !== 0) return;
    cursor = track(p, host);
    const scale = host.view().scale;
    if (points.length >= 3 && dist(p.world, points[0]) * scale <= CLOSE_PX) {
      finish(host, true);
      return;
    }
    if (p.clickCount >= 2 && points.length >= 2) {
      finish(host, false);
      return;
    }
    const n = nextPoint();
    if (n) addPoint(n, host);
  },
  onMove(p, host) {
    cursor = track(p, host);
    updateHud(host);
    host.requestRender();
  },
  onKey(e, host) {
    if (points.length === 0) return false;
    if (e.key === "Escape") {
      reset(host);
      return true;
    }
    if (e.key === "Backspace" && !input.typing) {
      points = points.slice(0, -1);
      updateHud(host);
      host.requestRender();
      return true;
    }
    const r = input.handleKey(e);
    if (r === "enter") {
      if (input.typing) {
        const n = nextPoint();
        if (n) addPoint(n, host);
      } else finish(host, false);
      return true;
    }
    if (r === "changed") {
      updateHud(host);
      host.requestRender();
      return true;
    }
    return false;
  },
  onDeactivate(host) {
    reset(host);
  },
  drawOverlay(ctx, host) {
    if (points.length === 0) return;
    const n = nextPoint();
    const pts = [...points, ...(n ? [n] : [])].map(host.toScreen);
    ctx.strokeStyle = OVERLAY_COLOR;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const q of pts.slice(1)) ctx.lineTo(q.x, q.y);
    ctx.stroke();
    for (const q of pts.slice(0, points.length)) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(q.x - 3, q.y - 3, 6, 6);
      ctx.strokeRect(q.x - 3.5, q.y - 3.5, 7, 7);
    }
    const first = pts[0];
    if (points.length >= 3 && cursor && dist(host.toScreen(cursor), first) <= CLOSE_PX) {
      ctx.beginPath();
      ctx.arc(first.x, first.y, 8, 0, Math.PI * 2);
      ctx.stroke();
      drawLabel(ctx, "Close shape", first);
    }
  },
};
