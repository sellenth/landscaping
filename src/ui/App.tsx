import { useEffect, useState, type ReactNode } from "react";
import { formatLength } from "../model/units";
import { editor, useEditor, type ToolId } from "../store/editor";
import { TOOLBAR, TOOLS } from "../tools";
import { deleteSelectedNode } from "../tools/nodeTool";
import type { ToolHost } from "../tools/tool";
import {
  deleteSelection,
  duplicateSelection,
  exportBidCsv,
  importImage,
  newPlan,
  nudgeSelection,
  openPlan,
  reorderSelection,
  savePlan,
  selectAll,
  zoomBy,
  zoomToFit,
} from "./actions";
import { RedoIcon, ToolIcon, UndoIcon } from "./Icons";
import { Inspector } from "./Inspector";
import { LayersPanel, QuantitiesPanel } from "./Panels";
import { PlanCanvas, isTyping } from "./PlanCanvas";

const TOOL_KEYS: Record<string, ToolId> = Object.fromEntries(TOOLBAR.map((t) => [t.key.toLowerCase(), t.id]));

function useGlobalShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const state = editor.getState();
      const host = (window as unknown as { __toolHost?: ToolHost }).__toolHost;
      const mod = e.metaKey || e.ctrlKey;

      // The active tool gets first look (typed dimensions, Escape, Enter).
      if (host && TOOLS[state.tool].onKey?.(e, host)) {
        e.preventDefault();
        return;
      }

      const key = e.key.toLowerCase();
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) editor.redo();
        else editor.undo();
      } else if (mod && key === "y") {
        e.preventDefault();
        editor.redo();
      } else if (mod && key === "s") {
        e.preventDefault();
        savePlan();
      } else if (mod && key === "o") {
        e.preventDefault();
        void openPlan();
      } else if (mod && key === "d") {
        e.preventDefault();
        duplicateSelection();
      } else if (mod && key === "a") {
        e.preventDefault();
        selectAll();
      } else if (mod && (key === "=" || key === "+")) {
        e.preventDefault();
        zoomBy(1.25);
      } else if (mod && key === "-") {
        e.preventDefault();
        zoomBy(0.8);
      } else if (mod) {
        return;
      } else if (key === "delete" || key === "backspace") {
        e.preventDefault();
        if (state.tool === "node" && host && deleteSelectedNode(host)) return;
        deleteSelection();
      } else if (key === "escape") {
        if (state.tool !== "select") editor.setTool("select");
        else editor.select([]);
      } else if (key === "enter" && state.tool === "select" && state.selection.length === 1) {
        editor.setTool("node");
      } else if (key.startsWith("arrow")) {
        if (state.selection.length === 0) return;
        e.preventDefault();
        const step = e.shiftKey ? 12 : 1;
        const d = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] }[key];
        if (d) nudgeSelection(d[0], d[1]);
      } else if (key === "]") {
        reorderSelection(1);
      } else if (key === "[") {
        reorderSelection(-1);
      } else if (key === "1" && e.shiftKey) {
        zoomToFit();
      } else if (key === "g") {
        editor.set({ snapToGrid: !state.snapToGrid });
        editor.showToast(`Snap to grid ${!state.snapToGrid ? "on" : "off"}`);
      } else if (key === "i") {
        void importImage();
      } else if (TOOL_KEYS[key]) {
        editor.setTool(TOOL_KEYS[key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export function App() {
  useGlobalShortcuts();
  return (
    <div className="app">
      <TopBar />
      <Toolbar />
      <main className="stage">
        <PlanCanvas />
      </main>
      <aside className="sidebar" aria-label="Plan details">
        <Section title="Properties">
          <Inspector />
        </Section>
        <Section title="Quantities & bid">
          <QuantitiesPanel />
        </Section>
        <Section title="Layers">
          <LayersPanel />
        </Section>
      </aside>
      <StatusBar />
      <Toast />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="panel">
      <h2>
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="chevron" aria-hidden="true">{open ? "▾" : "▸"}</span>
          {title}
        </button>
      </h2>
      {open && <div className="panel-body">{children}</div>}
    </section>
  );
}

function TopBar() {
  const name = useEditor((s) => s.doc.name);
  const canUndo = useEditor((s) => s.canUndo);
  const canRedo = useEditor((s) => s.canRedo);
  const undoLabel = useEditor((s) => s.undoLabel);
  const redoLabel = useEditor((s) => s.redoLabel);
  const saveStatus = useEditor((s) => s.saveStatus);
  return (
    <header className="topbar">
      <div className="brand" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 22 22">
          <circle cx="8" cy="9" r="6" fill="#7fa866" stroke="#2c312b" strokeWidth="1.2" />
          <circle cx="15.5" cy="14" r="4.5" fill="#b7d39a" stroke="#2c312b" strokeWidth="1.2" />
        </svg>
      </div>
      <input
        id="plan-name"
        className="plan-name"
        aria-label="Plan name"
        key={name}
        defaultValue={name}
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (v && v !== name) editor.commit({ ...editor.doc, name: v }, "Rename plan");
          else e.target.value = name;
        }}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
      <span className={`save-status ${saveStatus}`} role="status">
        {saveStatus === "saved" ? "All changes saved on this computer" : saveStatus === "saving" ? "Saving…" : "Couldn't autosave. Use Save file."}
      </span>
      <div className="topbar-actions">
        <button type="button" className="icon-btn" disabled={!canUndo} onClick={() => editor.undo()} title={undoLabel ? `Undo ${undoLabel} (⌘Z)` : "Undo (⌘Z)"} aria-label="Undo">
          <UndoIcon />
        </button>
        <button type="button" className="icon-btn" disabled={!canRedo} onClick={() => editor.redo()} title={redoLabel ? `Redo ${redoLabel} (⇧⌘Z)` : "Redo (⇧⌘Z)"} aria-label="Redo">
          <RedoIcon />
        </button>
        <span className="divider" />
        <button type="button" className="btn" onClick={() => void importImage()} title="Import a survey, aerial photo or sketch (I)">Import image</button>
        <button type="button" className="btn" onClick={exportBidCsv}>Export bid</button>
        <span className="divider" />
        <button type="button" className="btn ghost" onClick={newPlan}>New</button>
        <button type="button" className="btn ghost" onClick={() => void openPlan()} title="Open a plan file (⌘O)">Open…</button>
        <button type="button" className="btn primary" onClick={savePlan} title="Download the plan file (⌘S)">Save file</button>
      </div>
    </header>
  );
}

function Toolbar() {
  const tool = useEditor((s) => s.tool);
  return (
    <nav className="toolbar" aria-label="Tools">
      {TOOLBAR.map((t) => (
        <button
          key={t.id}
          type="button"
          className="tool-btn"
          aria-pressed={tool === t.id}
          aria-label={`${t.label} (${t.key})`}
          data-tool={t.id}
          onClick={() => editor.setTool(t.id)}
        >
          <ToolIcon id={t.id} />
          <span className="tool-key">{t.key}</span>
          <span className="tooltip" role="tooltip">
            <b>{t.label}</b> <kbd>{t.key}</kbd>
            <br />
            {t.description}
          </span>
        </button>
      ))}
    </nav>
  );
}

function StatusBar() {
  const cursor = useEditor((s) => s.cursorWorld);
  const tool = useEditor((s) => s.tool);
  const snapToGrid = useEditor((s) => s.snapToGrid);
  const snapToPoints = useEditor((s) => s.snapToPoints);
  const scale = useEditor((s) => s.view.scale);
  const activeLayer = useEditor((s) => s.doc.layers.find((l) => l.id === s.activeLayerId)?.name);
  const info = TOOLBAR.find((t) => t.id === tool);
  return (
    <footer className="statusbar">
      <span className="coords" aria-label="Cursor position">
        {cursor ? `${formatLength(cursor.x)}, ${formatLength(-cursor.y)}` : "–"}
      </span>
      <span className="muted">1 px ≈ {formatLength(1 / scale)}</span>
      <span className="muted">Drawing on <b>{activeLayer}</b></span>
      <span className="tool-hint">{tool === "calibrate" ? "Set scale: click two points with a known distance, then type it" : info?.description}</span>
      <label className="toggle">
        <input id="snap-points" type="checkbox" checked={snapToPoints} onChange={(e) => editor.set({ snapToPoints: e.target.checked })} />
        Snap to points
      </label>
      <label className="toggle">
        <input id="snap-grid" type="checkbox" checked={snapToGrid} onChange={(e) => editor.set({ snapToGrid: e.target.checked })} />
        Snap to grid <kbd>G</kbd>
      </label>
      <button type="button" className="btn ghost small" onClick={zoomToFit} title="Zoom to fit (⇧1)">Fit</button>
    </footer>
  );
}

function Toast() {
  const toast = useEditor((s) => s.toast);
  if (!toast) return null;
  return (
    <div className="toast" role="status" key={toast.id}>
      {toast.text}
    </div>
  );
}
