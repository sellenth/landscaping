import type { Vec } from "../geometry/vec";
import { moveObjects } from "../model/ops";
import type { LandscapeDocument } from "../model/types";
import { formatLength } from "../model/units";
import { cachedBounds } from "../render/renderer";
import { OVERLAY_COLOR, type Tool, drawLabel, hitTest } from "./tool";

type Mode =
  | { kind: "idle" }
  | { kind: "move"; start: Vec; base: LandscapeDocument; ids: string[]; moved: boolean; anchor: Vec | null }
  | { kind: "marquee"; start: Vec; current: Vec; additive: boolean };

let mode: Mode = { kind: "idle" };
let lastDelta: Vec = { x: 0, y: 0 };

export const selectTool: Tool = {
  cursor: "default",

  onDown(p, host) {
    const { editor } = host;
    const state = editor.getState();
    if (p.button !== 0) return;
    const hit = hitTest(state.doc, p.world, state.view.scale);

    if (hit && p.clickCount >= 2 && state.doc.objects.some((o) => o.id === hit)) {
      editor.select([hit]);
      editor.setTool("node");
      return;
    }

    if (hit) {
      let selection = state.selection;
      if (p.shift) {
        selection = selection.includes(hit) ? selection.filter((id) => id !== hit) : [...selection, hit];
        editor.select(selection);
        return;
      }
      if (!selection.includes(hit)) {
        selection = [hit];
        editor.select(selection);
      }
      // Snap the move by the grabbed shape's nearest node, so shapes can be dropped onto each other's corners.
      const shape = state.doc.objects.find((o) => o.id === hit);
      let anchor: Vec | null = null;
      if (shape) {
        let best = Infinity;
        for (const n of shape.path.nodes) {
          const d = Math.hypot(n.x - p.world.x, n.y - p.world.y);
          if (d < best) {
            best = d;
            anchor = { x: n.x, y: n.y };
          }
        }
      }
      mode = { kind: "move", start: p.world, base: state.doc, ids: selection, moved: false, anchor };
      return;
    }

    mode = { kind: "marquee", start: p.world, current: p.world, additive: p.shift };
    if (!p.shift) editor.select([]);
  },

  onMove(p, host) {
    const { editor } = host;
    if (mode.kind === "move") {
      let d = { x: p.world.x - mode.start.x, y: p.world.y - mode.start.y };
      const px = Math.hypot(d.x, d.y) * editor.getState().view.scale;
      if (!mode.moved && px < 3) return;
      mode.moved = true;
      if (p.shift) {
        if (Math.abs(d.x) > Math.abs(d.y)) d.y = 0;
        else d.x = 0;
      }
      if (mode.anchor && !p.alt) {
        const target = { x: mode.anchor.x + d.x, y: mode.anchor.y + d.y };
        const snapped = host.snap(target, { exclude: new Set(mode.ids) });
        host.setSnapIndicator(snapped.kind ? snapped : null);
        if (!p.shift) d = { x: snapped.point.x - mode.anchor.x, y: snapped.point.y - mode.anchor.y };
      }
      lastDelta = d;
      editor.preview(moveObjects(mode.base, mode.ids, d));
      host.requestRender();
    } else if (mode.kind === "marquee") {
      mode.current = p.world;
      host.requestRender();
    }
  },

  onUp(_p, host) {
    const { editor } = host;
    if (mode.kind === "move") {
      if (mode.moved) editor.commit(editor.doc, mode.ids.length > 1 ? `Move ${mode.ids.length} objects` : "Move");
      host.setSnapIndicator(null);
    } else if (mode.kind === "marquee") {
      const { start, current } = mode;
      const box = {
        minX: Math.min(start.x, current.x), maxX: Math.max(start.x, current.x),
        minY: Math.min(start.y, current.y), maxY: Math.max(start.y, current.y),
      };
      // CAD convention: drag right to select what's fully inside, drag left to select anything touched.
      const crossing = current.x < start.x;
      const state = editor.getState();
      const blocked = new Set(state.doc.layers.filter((l) => !l.visible || l.locked).map((l) => l.id));
      const ids = state.doc.objects
        .filter((s) => !blocked.has(s.layerId))
        .filter((s) => {
          const b = cachedBounds(s.path);
          return crossing
            ? b.minX <= box.maxX && b.maxX >= box.minX && b.minY <= box.maxY && b.maxY >= box.minY
            : b.minX >= box.minX && b.maxX <= box.maxX && b.minY >= box.minY && b.maxY <= box.maxY;
        })
        .map((s) => s.id);
      const size = Math.hypot(box.maxX - box.minX, box.maxY - box.minY) * state.view.scale;
      if (size > 3) editor.select(mode.additive ? [...new Set([...state.selection, ...ids])] : ids);
    }
    mode = { kind: "idle" };
    host.requestRender();
  },

  onDeactivate() {
    mode = { kind: "idle" };
  },

  drawOverlay(ctx, host) {
    if (mode.kind === "marquee") {
      const a = host.toScreen(mode.start), b = host.toScreen(mode.current);
      const crossing = b.x < a.x;
      ctx.fillStyle = crossing ? "rgba(70, 150, 90, 0.08)" : "rgba(47, 116, 208, 0.08)";
      ctx.strokeStyle = crossing ? "#3f8a4f" : OVERLAY_COLOR;
      ctx.lineWidth = 1;
      ctx.setLineDash(crossing ? [5, 4] : []);
      ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
      ctx.strokeRect(a.x + 0.5, a.y + 0.5, b.x - a.x, b.y - a.y);
      ctx.setLineDash([]);
    } else if (mode.kind === "move" && mode.moved) {
      const s = host.toScreen(host.editor.getState().cursorWorld ?? mode.start);
      drawLabel(ctx, `Δ ${formatLength(lastDelta.x)}, ${formatLength(lastDelta.y)}`, s);
    }
  },
};
