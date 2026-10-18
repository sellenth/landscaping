import { fitStroke } from "../geometry/fitCurve";
import { type Vec, dist } from "../geometry/vec";
import { createShape } from "./drawing";
import { OVERLAY_COLOR, type Tool, type ToolHost, drawLabel } from "./tool";

/** How far (in screen pixels) the fitted curve may stray from the drawn stroke. */
const FIT_TOLERANCE_PX = 5;
const CLOSE_PX = 18;

let stroke: Vec[] = [];
let drawing = false;

function willClose(host: ToolHost) {
  if (stroke.length < 8) return false;
  const scale = host.view().scale;
  let travelled = 0;
  for (let i = 1; i < stroke.length; i++) travelled += dist(stroke[i - 1], stroke[i]);
  return dist(stroke[0], stroke[stroke.length - 1]) * scale <= CLOSE_PX && travelled * scale > CLOSE_PX * 4;
}

/**
 * Smooth curve tool: sketch a bed line the way you would with a pencil.
 * On release it becomes a few clean, editable Bézier curves. End near the
 * start to make a closed bed.
 */
export const curveTool: Tool = {
  cursor: "crosshair",
  onDown(p, host) {
    if (p.button !== 0) return;
    drawing = true;
    stroke = [p.world];
    host.editor.set({ hud: { fields: [], hint: "Sketch a curve · end near the start to close it" } });
  },
  onMove(p, host) {
    if (!drawing) return;
    stroke.push(p.world);
    host.requestRender();
  },
  onUp(_p, host) {
    if (!drawing) return;
    drawing = false;
    const scale = host.view().scale;
    const closed = willClose(host);
    const pts = stroke;
    stroke = [];
    host.editor.set({ hud: null });
    host.requestRender();
    if (pts.length < 3) return;
    let length = 0;
    for (let i = 1; i < pts.length; i++) length += dist(pts[i - 1], pts[i]);
    if (length * scale < 6) return;
    const path = fitStroke(pts, FIT_TOLERANCE_PX / scale, closed);
    if (path.nodes.length < 2) return;
    createShape(host, path, closed ? "Bed" : "Curve");
  },
  onKey(e, host) {
    if (e.key === "Escape" && drawing) {
      drawing = false;
      stroke = [];
      host.editor.set({ hud: null });
      host.requestRender();
      return true;
    }
    return false;
  },
  onDeactivate() {
    drawing = false;
    stroke = [];
  },
  drawOverlay(ctx, host) {
    if (stroke.length < 2) return;
    const pts = stroke.map(host.toScreen);
    ctx.strokeStyle = OVERLAY_COLOR;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const q of pts) ctx.lineTo(q.x, q.y);
    ctx.stroke();
    if (willClose(host)) {
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, 8, 0, Math.PI * 2);
      ctx.stroke();
      drawLabel(ctx, "Release to close", pts[0]);
    }
  },
};
