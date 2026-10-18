import { type Path, type PathNode, closestOnPath, cornerNode, insertNode, smoothNode } from "../geometry/path";
import { type Vec, add, dist, normalize, scale, sub } from "../geometry/vec";
import { updateShapes } from "../model/ops";
import type { LandscapeDocument, Shape } from "../model/types";
import { OVERLAY_COLOR, type Tool, type ToolHost, hitTest } from "./tool";

type Grab =
  | { kind: "node"; index: number }
  | { kind: "handle"; index: number; side: "in" | "out" };

type Mode =
  | { kind: "idle" }
  | { kind: "drag"; grab: Grab; base: LandscapeDocument; shapeId: string; start: Vec; moved: boolean };

let mode: Mode = { kind: "idle" };

function activeShape(host: ToolHost): Shape | null {
  const s = host.editor.getState();
  if (s.selection.length !== 1) return null;
  return s.doc.objects.find((o) => o.id === s.selection[0]) ?? null;
}

const HIT_PX = 8;

function visibleHandleNodes(path: Path, selected: number | null): Set<number> {
  if (path.nodes.length <= 40) return new Set(path.nodes.map((_, i) => i));
  if (selected === null) return new Set();
  const n = path.nodes.length;
  return new Set([selected, (selected + 1) % n, (selected - 1 + n) % n]);
}

function grabAt(path: Path, world: Vec, scale: number, selected: number | null): Grab | null {
  const tol = HIT_PX / scale;
  const handleNodes = visibleHandleNodes(path, selected);
  for (const i of handleNodes) {
    const n = path.nodes[i];
    for (const side of ["in", "out"] as const) {
      const h = n[side];
      if (h && dist(h, world) <= tol) return { kind: "handle", index: i, side };
    }
  }
  let best: Grab | null = null;
  let bestD = tol;
  path.nodes.forEach((n, i) => {
    const d = dist(n, world);
    if (d <= bestD) {
      bestD = d;
      best = { kind: "node", index: i };
    }
  });
  return best;
}

function withNode(path: Path, index: number, node: PathNode): Path {
  const nodes = path.nodes.slice();
  nodes[index] = node;
  return { closed: path.closed, nodes };
}

function isSmooth(n: PathNode): boolean {
  if (!n.in || !n.out) return false;
  const a = normalize(sub(n, n.in));
  const b = normalize(sub(n.out, n));
  return Math.abs(a.x * b.y - a.y * b.x) < 0.02 && a.x * b.x + a.y * b.y > 0;
}

export function deleteSelectedNode(host: ToolHost): boolean {
  const shape = activeShape(host);
  const index = host.editor.getState().nodeSelection;
  if (!shape || index === null) return false;
  const min = shape.path.closed ? 3 : 2;
  if (shape.path.nodes.length <= min) {
    host.editor.showToast(`A ${shape.path.closed ? "closed shape needs 3" : "line needs 2"} points`);
    return true;
  }
  const nodes = shape.path.nodes.filter((_, i) => i !== index);
  host.editor.commit(updateShapes(host.editor.doc, [shape.id], { path: { closed: shape.path.closed, nodes } }), "Delete point", {
    nodeSelection: null,
  });
  return true;
}

export const nodeTool: Tool = {
  cursor: "default",

  onDown(p, host) {
    const { editor } = host;
    const state = editor.getState();
    const shape = activeShape(host);
    if (shape) {
      const grab = grabAt(shape.path, p.world, state.view.scale, state.nodeSelection);
      if (grab) {
        if (grab.kind === "node" && p.alt) {
          const n = shape.path.nodes[grab.index];
          const next = n.in || n.out ? cornerNode(n) : smoothNode(shape.path, grab.index);
          editor.commit(updateShapes(state.doc, [shape.id], { path: withNode(shape.path, grab.index, next) }), n.in || n.out ? "Make corner" : "Make smooth", {
            nodeSelection: grab.index,
          });
          return;
        }
        editor.set({ nodeSelection: grab.index });
        mode = { kind: "drag", grab, base: state.doc, shapeId: shape.id, start: p.world, moved: false };
        return;
      }
      // Click on the outline adds a point there.
      const hit = closestOnPath(shape.path, p.world);
      if (hit.distance <= HIT_PX / state.view.scale) {
        const path = insertNode(shape.path, hit.segIndex, hit.t);
        editor.commit(updateShapes(state.doc, [shape.id], { path }), "Add point", { nodeSelection: hit.segIndex + 1 });
        return;
      }
    }
    const other = hitTest(state.doc, p.world, state.view.scale);
    if (other && state.doc.objects.some((o) => o.id === other)) editor.select([other]);
    else {
      editor.select([]);
      editor.setTool("select");
    }
  },

  onMove(p, host) {
    if (mode.kind !== "drag") return;
    const { editor } = host;
    const shapeId = mode.shapeId;
    const base = mode.base.objects.find((o) => o.id === shapeId);
    if (!base) return;
    if (!mode.moved && dist(p.world, mode.start) * editor.getState().view.scale < 2) return;
    mode.moved = true;
    const path = base.path;
    const { grab } = mode;
    const n = path.nodes[grab.index];
    let next: PathNode;
    if (grab.kind === "node") {
      const snapped = host.snap(p.world, { exclude: new Set([mode.shapeId]), bypass: p.alt });
      host.setSnapIndicator(snapped.kind ? snapped : null);
      const target = snapped.point;
      const d = sub(target, n);
      next = { x: target.x, y: target.y };
      if (n.in) next.in = add(n.in, d);
      if (n.out) next.out = add(n.out, d);
    } else {
      const other = grab.side === "in" ? "out" : "in";
      next = { ...n, [grab.side]: p.world };
      // Keep smooth nodes smooth: the opposite handle turns to stay in line (hold Alt to break it).
      const opposite = n[other];
      if (opposite && isSmooth(n) && !p.alt) {
        const dir = normalize(sub(n, p.world));
        next[other] = add(n, scale(dir, dist(n, opposite)));
      }
    }
    editor.preview(updateShapes(mode.base, [mode.shapeId], { path: withNode(path, grab.index, next) }));
    host.requestRender();
  },

  onUp(_p, host) {
    if (mode.kind === "drag" && mode.moved) {
      host.editor.commit(host.editor.doc, mode.grab.kind === "node" ? "Move point" : "Adjust curve");
    }
    host.setSnapIndicator(null);
    mode = { kind: "idle" };
  },

  onKey(e, host) {
    if ((e.key === "Delete" || e.key === "Backspace") && host.editor.getState().nodeSelection !== null) {
      return deleteSelectedNode(host);
    }
    if (e.key === "Escape") {
      host.editor.setTool("select");
      return true;
    }
    return false;
  },

  onDeactivate() {
    mode = { kind: "idle" };
  },

  drawOverlay(ctx, host) {
    const shape = activeShape(host);
    if (!shape) return;
    const selected = host.editor.getState().nodeSelection;
    const handleNodes = visibleHandleNodes(shape.path, selected);
    ctx.lineWidth = 1;
    shape.path.nodes.forEach((n, i) => {
      if (!handleNodes.has(i)) return;
      const s = host.toScreen(n);
      for (const side of ["in", "out"] as const) {
        const h = n[side];
        if (!h) continue;
        const hs = host.toScreen(h);
        ctx.strokeStyle = "rgba(47, 116, 208, 0.7)";
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(hs.x, hs.y);
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = OVERLAY_COLOR;
        ctx.beginPath();
        ctx.arc(hs.x, hs.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });
    shape.path.nodes.forEach((n, i) => {
      const s = host.toScreen(n);
      const r = i === selected ? 5 : 4;
      ctx.fillStyle = i === selected ? OVERLAY_COLOR : "#fff";
      ctx.strokeStyle = OVERLAY_COLOR;
      ctx.lineWidth = 1.5;
      ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
      ctx.strokeRect(s.x - r + 0.5, s.y - r + 0.5, r * 2 - 1, r * 2 - 1);
    });
  },
};
