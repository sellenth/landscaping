import { useEffect, useRef } from "react";
import type { Vec } from "../geometry/vec";
import { formatLength } from "../model/units";
import { PAPER, renderScene } from "../render/renderer";
import { editor, useEditor, type View } from "../store/editor";
import { fitView, zoomAt } from "./viewMath";
import { TOOLS } from "../tools";
import { type PointerInfo, type SnapResult, type ToolHost, snapPoint } from "../tools/tool";
import { handleDroppedFiles } from "./actions";

/** A scale bar length that renders around 80–160 px wide. */
function scaleBarFeet(scale: number) {
  const options = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];
  return options.find((ft) => ft * 12 * scale >= 80) ?? options[options.length - 1];
}

export function PlanCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tool = useEditor((s) => s.tool);
  const hasContent = useEditor((s) => s.doc.objects.length > 0 || s.doc.underlays.length > 0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d")!;
    let size = { w: 0, h: 0, dpr: 1 };
    let frame = 0;
    let snapIndicator: SnapResult | null = null;
    let spaceDown = false;
    let pan: { start: Vec; view: View } | null = null;
    let lastDown = { time: 0, x: 0, y: 0, count: 0 };
    let activeToolId = editor.getState().tool;
    let firstLayout = true;

    const toWorld = (s: Vec): Vec => {
      const v = editor.getState().view;
      return { x: (s.x - v.ox) / v.scale, y: (s.y - v.oy) / v.scale };
    };
    const toScreen = (w: Vec): Vec => {
      const v = editor.getState().view;
      return { x: w.x * v.scale + v.ox, y: w.y * v.scale + v.oy };
    };

    const draw = () => {
      frame = 0;
      const state = editor.getState();
      const { w, h, dpr } = size;
      if (w === 0) return;
      renderScene(ctx, {
        doc: state.doc,
        view: state.view,
        selection: state.selection,
        width: w,
        height: h,
        dpr,
        showGrid: true,
        requestRender,
      });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      TOOLS[state.tool].drawOverlay?.(ctx, host);
      if (snapIndicator?.kind) {
        const s = toScreen(snapIndicator.point);
        ctx.strokeStyle = snapIndicator.kind === "node" ? "#d9480f" : "#2f74d0";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (snapIndicator.kind === "node") ctx.rect(s.x - 5, s.y - 5, 10, 10);
        else {
          ctx.moveTo(s.x - 6, s.y);
          ctx.lineTo(s.x + 6, s.y);
          ctx.moveTo(s.x, s.y - 6);
          ctx.lineTo(s.x, s.y + 6);
        }
        ctx.stroke();
      }
      drawScaleBar(state.view.scale, h);
    };

    const drawScaleBar = (scale: number, h: number) => {
      const ft = scaleBarFeet(scale);
      const px = ft * 12 * scale;
      const x = 16, y = h - 22;
      ctx.fillStyle = "rgba(251, 250, 246, 0.85)";
      ctx.fillRect(x - 6, y - 18, px + 52, 30);
      ctx.fillStyle = "#2c312b";
      ctx.fillRect(x, y, px / 2, 5);
      ctx.strokeStyle = "#2c312b";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + px / 2 + 0.5, y + 0.5, px / 2 - 1, 4);
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillText("0", x - 3, y - 4);
      ctx.fillText(`${ft} ft`, x + px - 6, y - 4);
      // North arrow
      const nx = x + px + 30, ny = y - 2;
      ctx.beginPath();
      ctx.moveTo(nx, ny - 10);
      ctx.lineTo(nx + 5, ny + 4);
      ctx.lineTo(nx, ny + 1);
      ctx.lineTo(nx - 5, ny + 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillText("N", nx - 4, ny - 13 < 0 ? ny + 16 : ny - 13);
    };

    function requestRender() {
      if (!frame) frame = requestAnimationFrame(draw);
    }

    const host: ToolHost = {
      editor,
      view: () => editor.getState().view,
      toScreen,
      toWorld,
      requestRender,
      snap(world, opts) {
        const s = editor.getState();
        if (opts?.bypass) return { point: world, kind: null };
        return snapPoint(s.doc, s.view, world, { toGrid: s.snapToGrid, toPoints: s.snapToPoints, exclude: opts?.exclude });
      },
      setSnapIndicator(s) {
        snapIndicator = s;
        requestRender();
      },
    };

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      size = { w: r.width, h: r.height, dpr };
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      canvas.style.width = `${r.width}px`;
      canvas.style.height = `${r.height}px`;
      if (firstLayout && r.width > 0) {
        firstLayout = false;
        fitView(editor, r.width, r.height);
      }
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const unsub = editor.subscribe(() => {
      const t = editor.getState().tool;
      if (t !== activeToolId) {
        const previous = activeToolId;
        // Update first: onDeactivate may itself change editor state and re-enter this listener.
        activeToolId = t;
        TOOLS[previous].onDeactivate?.(host);
        canvas.style.cursor = TOOLS[t].cursor;
      }
      requestRender();
    });

    const info = (e: PointerEvent | MouseEvent, clickCount = 1): PointerInfo => {
      const r = canvas.getBoundingClientRect();
      const screen = { x: e.clientX - r.left, y: e.clientY - r.top };
      return {
        screen,
        world: toWorld(screen),
        shift: e.shiftKey,
        alt: e.altKey,
        mod: e.ctrlKey || e.metaKey,
        button: e.button,
        clickCount,
      };
    };

    const onPointerDown = (e: PointerEvent) => {
      canvas.focus();
      canvas.setPointerCapture(e.pointerId);
      const tool = editor.getState().tool;
      if (e.button === 1 || (e.button === 0 && (spaceDown || tool === "hand"))) {
        pan = { start: { x: e.clientX, y: e.clientY }, view: editor.getState().view };
        canvas.style.cursor = "grabbing";
        e.preventDefault();
        return;
      }
      const now = performance.now();
      const near = Math.hypot(e.clientX - lastDown.x, e.clientY - lastDown.y) < 6;
      const count = now - lastDown.time < 400 && near ? lastDown.count + 1 : 1;
      lastDown = { time: now, x: e.clientX, y: e.clientY, count };
      TOOLS[tool].onDown?.(info(e, count), host);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pan) {
        const v = pan.view;
        editor.set({ view: { ...v, ox: v.ox + e.clientX - pan.start.x, oy: v.oy + e.clientY - pan.start.y } });
        return;
      }
      const p = info(e);
      p.button = e.buttons & 1 ? 0 : -1;
      editor.set({ cursorWorld: p.world });
      TOOLS[editor.getState().tool].onMove?.(p, host);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (pan) {
        pan = null;
        canvas.style.cursor = spaceDown ? "grab" : TOOLS[editor.getState().tool].cursor;
        return;
      }
      TOOLS[editor.getState().tool].onUp?.(info(e), host);
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const screen = { x: e.clientX - r.left, y: e.clientY - r.top };
      const view = editor.getState().view;
      // Mouse wheels zoom (CAD habit); trackpad two-finger scrolls pan; pinch zooms.
      const looksLikeMouseWheel = e.deltaMode !== 0 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 40 && Number.isInteger(e.deltaY));
      if (e.ctrlKey || looksLikeMouseWheel) {
        const delta = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
        editor.set({ view: zoomAt(view, screen, Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0015))) });
      } else {
        editor.set({ view: { ...view, ox: view.ox - e.deltaX, oy: view.oy - e.deltaY } });
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " && !spaceDown && !isTyping(e)) {
        const hud = editor.getState().hud;
        if (hud && hud.fields.some((f) => f.text)) return;
        spaceDown = true;
        canvas.style.cursor = "grab";
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") {
        spaceDown = false;
        canvas.style.cursor = TOOLS[editor.getState().tool].cursor;
      }
    };
    const onLeave = () => editor.set({ cursorWorld: null });
    const onDragOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const files = [...(e.dataTransfer?.files ?? [])];
      const r = canvas.getBoundingClientRect();
      if (files.length) void handleDroppedFiles(files, toWorld({ x: e.clientX - r.left, y: e.clientY - r.top }));
    };

    canvas.style.cursor = TOOLS[activeToolId].cursor;
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("dragover", onDragOver);
    canvas.addEventListener("drop", onDrop);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    (window as unknown as { __toolHost: ToolHost }).__toolHost = host;

    return () => {
      ro.disconnect();
      unsub();
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("dragover", onDragOver);
      canvas.removeEventListener("drop", onDrop);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <div className="canvas-wrap" ref={wrapRef} style={{ background: PAPER }} data-tool={tool}>
      <canvas ref={canvasRef} className="plan-canvas" tabIndex={0} aria-label="Plan drawing area" data-testid="plan-canvas" />
      <Hud />
      {!hasContent && <EmptyState />}
    </div>
  );
}

export function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
}

function Hud() {
  const hud = useEditor((s) => s.hud);
  const cursor = useEditor((s) => s.cursorWorld);
  const view = useEditor((s) => s.view);
  if (!hud) return null;
  const left = cursor ? cursor.x * view.scale + view.ox + 18 : 24;
  const top = cursor ? cursor.y * view.scale + view.oy + 18 : 24;
  return (
    <div className="hud" style={{ left, top }} role="status">
      {hud.fields.map((f) => (
        <div key={f.label} className={`hud-field${f.active ? " active" : ""}`}>
          <span className="hud-label">{f.label}</span>
          <span className={f.text ? "hud-value" : "hud-value placeholder"}>{f.text || f.placeholder}</span>
          {f.active && f.text && <span className="hud-caret" />}
        </div>
      ))}
      <div className="hud-hint">{hud.hint}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <h2>Start a plan</h2>
      <ol>
        <li>
          <b>Drop in a survey or aerial photo</b> (or use <kbd>Import image</kbd>), then <b>Set scale</b> by clicking two points with a known distance.
        </li>
        <li>
          Sketch beds with the <b>smooth curve</b> tool <kbd>C</kbd>, or draw patios with <kbd>R</kbd>, <kbd>O</kbd> and <kbd>L</kbd>. Type sizes like <code>{formatLength(150)}</code> while drawing.
        </li>
        <li>Pick a material and the quantities and bid total update as you draw.</li>
      </ol>
    </div>
  );
}
