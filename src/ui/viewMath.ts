import type { Vec } from "../geometry/vec";
import type { Editor, View } from "../store/editor";

const MIN_SCALE = 0.004; // ~ 1 px per 20 ft
const MAX_SCALE = 40; // 40 px per inch

export function zoomAt(view: View, screen: Vec, factor: number): View {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale * factor));
  const k = scale / view.scale;
  return { scale, ox: screen.x - (screen.x - view.ox) * k, oy: screen.y - (screen.y - view.oy) * k };
}

/** Zooms so the drawing (or a 120 ft square if empty) fills the view. */
export function fitView(ed: Editor, width: number, height: number) {
  const doc = ed.getState().doc;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of doc.objects) for (const n of s.path.nodes) {
    minX = Math.min(minX, n.x); minY = Math.min(minY, n.y); maxX = Math.max(maxX, n.x); maxY = Math.max(maxY, n.y);
  }
  for (const u of doc.underlays) {
    minX = Math.min(minX, u.x); minY = Math.min(minY, u.y); maxX = Math.max(maxX, u.x + u.width); maxY = Math.max(maxY, u.y + u.height);
  }
  if (!Number.isFinite(minX) || maxX - minX < 1) {
    minX = -720; maxX = 720; minY = -720; maxY = 720;
  }
  const pad = 60;
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min((width - pad * 2) / (maxX - minX), (height - pad * 2) / (maxY - minY))));
  ed.set({
    view: { scale, ox: width / 2 - ((minX + maxX) / 2) * scale, oy: height / 2 - ((minY + maxY) / 2) * scale },
  });
}

