import { ellipsePath, rectPath } from "../geometry/path";
import type { Vec } from "../geometry/vec";
import { formatLength, parseLength } from "../model/units";
import { DimensionInput, createShape } from "./drawing";
import { OVERLAY_COLOR, type PointerInfo, type Tool, type ToolHost } from "./tool";

/** Rectangle and ellipse tools: drag, or click twice, or click once and type the size. */
function makeBoxTool(kind: "rect" | "ellipse"): Tool {
  let anchor: Vec | null = null;
  let current: Vec | null = null;
  let downScreen: Vec | null = null;
  let modifiers = { shift: false, alt: false };
  const input = new DimensionInput(
    ["W", "H"],
    kind === "rect" ? "Type a size, Tab to switch, Enter to place" : "Type a size (H blank = circle), Enter to place",
  );

  function box(): { x: number; y: number; w: number; h: number } | null {
    if (!anchor || !current) return null;
    let w = current.x - anchor.x;
    let h = current.y - anchor.y;
    const typedW = parseLength(input.values[0]);
    const typedH = parseLength(input.values[1]);
    if (typedW !== null) w = Math.abs(typedW) * (Math.sign(w) || 1);
    if (typedH !== null) h = Math.abs(typedH) * (Math.sign(h) || 1);
    else if (typedW !== null && kind === "ellipse") h = Math.abs(w) * (Math.sign(h) || 1);
    if (modifiers.shift && typedW === null && typedH === null) {
      const s = Math.max(Math.abs(w), Math.abs(h));
      w = s * (Math.sign(w) || 1);
      h = s * (Math.sign(h) || 1);
    }
    if (modifiers.alt) return { x: anchor.x - w, y: anchor.y - h, w: w * 2, h: h * 2 };
    return { x: anchor.x, y: anchor.y, w, h };
  }

  function updateHud(host: ToolHost) {
    const b = box();
    host.editor.set({ hud: anchor ? input.hud([b ? formatLength(Math.abs(b.w)) : "", b ? formatLength(Math.abs(b.h)) : ""]) : null });
  }

  function finish(host: ToolHost) {
    const b = box();
    if (b && Math.abs(b.w) > 0.01 && Math.abs(b.h) > 0.01) {
      const path = kind === "rect" ? rectPath(b.x, b.y, b.w, b.h) : ellipsePath(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2);
      const name = kind === "rect" ? (Math.abs(Math.abs(b.w) - Math.abs(b.h)) < 0.01 ? "Square" : "Rectangle") : Math.abs(Math.abs(b.w) - Math.abs(b.h)) < 0.01 ? "Circle" : "Ellipse";
      createShape(host, path, name);
    }
    cancel(host);
  }

  function cancel(host: ToolHost) {
    anchor = current = downScreen = null;
    input.reset();
    host.editor.set({ hud: null });
    host.setSnapIndicator(null);
    host.requestRender();
  }

  function track(p: PointerInfo, host: ToolHost) {
    const snapped = host.snap(p.world, { bypass: p.mod });
    host.setSnapIndicator(snapped.kind ? snapped : null);
    modifiers = { shift: p.shift, alt: p.alt };
    return snapped.point;
  }

  return {
    cursor: "crosshair",
    onDown(p, host) {
      if (p.button !== 0) return;
      if (anchor) {
        current = track(p, host);
        finish(host);
        return;
      }
      anchor = track(p, host);
      current = anchor;
      downScreen = p.screen;
      updateHud(host);
    },
    onMove(p, host) {
      const pt = track(p, host);
      if (anchor) {
        current = pt;
        updateHud(host);
      }
      host.requestRender();
    },
    onUp(p, host) {
      if (!anchor || !downScreen) return;
      const dragged = Math.hypot(p.screen.x - downScreen.x, p.screen.y - downScreen.y) > 4;
      if (dragged && !input.typing) finish(host);
      // Otherwise: click-click mode, the next click (or Enter) places the shape.
    },
    onKey(e, host) {
      if (!anchor) return false;
      if (e.key === "Escape") {
        cancel(host);
        return true;
      }
      const r = input.handleKey(e);
      if (r === "enter") finish(host);
      else if (r === "changed") updateHud(host);
      else return false;
      host.requestRender();
      return true;
    },
    onDeactivate(host) {
      cancel(host);
    },
    drawOverlay(ctx, host) {
      const b = box();
      if (!b) return;
      const a = host.toScreen({ x: b.x, y: b.y });
      const c = host.toScreen({ x: b.x + b.w, y: b.y + b.h });
      ctx.strokeStyle = OVERLAY_COLOR;
      ctx.fillStyle = "rgba(47, 116, 208, 0.08)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (kind === "rect") ctx.rect(a.x, a.y, c.x - a.x, c.y - a.y);
      else ctx.ellipse((a.x + c.x) / 2, (a.y + c.y) / 2, Math.abs(c.x - a.x) / 2, Math.abs(c.y - a.y) / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    },
  };
}

export const rectTool = makeBoxTool("rect");
export const ellipseTool = makeBoxTool("ellipse");
