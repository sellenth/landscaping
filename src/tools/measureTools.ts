import { type Vec, dist } from "../geometry/vec";
import { updateUnderlay } from "../model/ops";
import { formatLength, parseLength } from "../model/units";
import { DimensionInput } from "./drawing";
import { OVERLAY_COLOR, type Tool, type ToolHost, drawLabel } from "./tool";

function drawRuler(ctx: CanvasRenderingContext2D, host: ToolHost, a: Vec, b: Vec, label: string) {
  const sa = host.toScreen(a), sb = host.toScreen(b);
  ctx.strokeStyle = OVERLAY_COLOR;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(sa.x, sa.y);
  ctx.lineTo(sb.x, sb.y);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const s of [sa, sb]) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = OVERLAY_COLOR;
    ctx.fill();
  }
  drawLabel(ctx, label, sb);
}

/** Quick measure: drag to read a distance. Nothing is added to the plan. */
let measureA: Vec | null = null;
let measureB: Vec | null = null;

export const measureTool: Tool = {
  cursor: "crosshair",
  onDown(p, host) {
    measureA = host.snap(p.world).point;
    measureB = measureA;
  },
  onMove(p, host) {
    const s = host.snap(p.world, { bypass: p.mod });
    host.setSnapIndicator(s.kind ? s : null);
    if (measureA && p.button === 0) measureB = s.point;
    host.requestRender();
  },
  onUp() {
    // Keep the last measurement on screen until the next one starts.
  },
  onDeactivate() {
    measureA = measureB = null;
  },
  drawOverlay(ctx, host) {
    if (measureA && measureB && dist(measureA, measureB) > 0) {
      drawRuler(ctx, host, measureA, measureB, formatLength(dist(measureA, measureB)));
    }
  },
};

/**
 * Set an underlay's scale: click two points on it whose real distance you
 * know (a property line, a driveway), then type that distance.
 */
let calA: Vec | null = null;
let calB: Vec | null = null;
let calCursor: Vec | null = null;
const calInput = new DimensionInput(["Real distance"], "Type the real distance between the two points, then Enter");

function calUnderlayId(host: ToolHost) {
  const s = host.editor.getState();
  return s.doc.underlays.find((u) => s.selection.includes(u.id))?.id ?? null;
}

function resetCal(host: ToolHost) {
  calA = calB = calCursor = null;
  calInput.reset();
  host.editor.set({ hud: null });
  host.requestRender();
}

export const calibrateTool: Tool = {
  cursor: "crosshair",
  onDown(p, host) {
    if (!calUnderlayId(host)) {
      host.editor.showToast("Select an underlay image first");
      host.editor.setTool("select");
      return;
    }
    if (!calA) {
      calA = p.world;
      host.editor.set({ hud: { fields: [], hint: "Now click the second point" } });
    } else if (!calB) {
      calB = p.world;
      host.editor.set({ hud: calInput.hud(["e.g. 120'"]) });
    }
    host.requestRender();
  },
  onMove(p, host) {
    calCursor = p.world;
    if (calA && !calB) host.requestRender();
  },
  onKey(e, host) {
    if (e.key === "Escape") {
      resetCal(host);
      host.editor.setTool("select");
      return true;
    }
    if (!calA || !calB) return false;
    const r = calInput.handleKey(e);
    if (r === "changed") {
      host.editor.set({ hud: calInput.hud(["e.g. 120'"]) });
      return true;
    }
    if (r === "enter") {
      const real = parseLength(calInput.values[0]);
      const measured = dist(calA, calB);
      const id = calUnderlayId(host);
      const u = host.editor.doc.underlays.find((x) => x.id === id);
      if (!real || real <= 0 || measured === 0 || !u) {
        host.editor.showToast("Type a distance like 120' or 36.5m");
        return true;
      }
      const f = real / measured;
      const origin = calA;
      host.editor.commit(
        updateUnderlay(host.editor.doc, u.id, {
          x: origin.x + (u.x - origin.x) * f,
          y: origin.y + (u.y - origin.y) * f,
          width: u.width * f,
          height: u.height * f,
        }),
        "Set underlay scale",
      );
      host.editor.showToast(`Scale set: that line is now ${formatLength(real)}`);
      resetCal(host);
      host.editor.setTool("select");
      return true;
    }
    return false;
  },
  onDeactivate(host) {
    resetCal(host);
  },
  drawOverlay(ctx, host) {
    const b = calB ?? calCursor;
    if (calA && b) drawRuler(ctx, host, calA, b, calB ? "Type the real distance" : "Click the second point");
  },
};

/** Hand tool: drag to pan. (Space-drag and middle-drag pan from any tool.) */
export const handTool: Tool = { cursor: "grab" };
