import { useSyncExternalStore } from "react";
import { createDocument } from "../model/document";
import type { LandscapeDocument } from "../model/types";
import { History } from "./history";

export type ToolId = "select" | "node" | "rect" | "ellipse" | "polygon" | "curve" | "hand" | "measure" | "calibrate";

/** Screen = world * scale + offset. `scale` is pixels per inch. */
export interface View {
  ox: number;
  oy: number;
  scale: number;
}

/** Typed-dimension readout shown next to the cursor while drawing. */
export interface Hud {
  fields: { label: string; text: string; active: boolean; placeholder: string }[];
  hint: string;
}

export interface EditorState {
  doc: LandscapeDocument;
  selection: string[];
  /** Selected node index while editing a single shape's nodes. */
  nodeSelection: number | null;
  tool: ToolId;
  view: View;
  activeLayerId: string;
  /** Material given to newly drawn closed shapes. */
  activeMaterialId: string | null;
  snapToGrid: boolean;
  snapToPoints: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  saveStatus: "saved" | "saving" | "error";
  hud: Hud | null;
  cursorWorld: { x: number; y: number } | null;
  toast: { id: number; text: string } | null;
}

type Listener = () => void;

export class Editor {
  readonly history: History;
  private state: EditorState;
  private listeners = new Set<Listener>();
  private toastCounter = 0;

  constructor(doc: LandscapeDocument = createDocument()) {
    this.history = new History(doc);
    this.state = {
      doc,
      selection: [],
      nodeSelection: null,
      tool: "select",
      view: { ox: 0, oy: 0, scale: 0.5 },
      activeLayerId: (doc.layers.find((l) => l.id === "layer-hardscape") ?? doc.layers[doc.layers.length - 1]).id,
      activeMaterialId: null,
      snapToGrid: false,
      snapToPoints: true,
      canUndo: false,
      canRedo: false,
      undoLabel: null,
      redoLabel: null,
      saveStatus: "saved",
      hud: null,
      cursorWorld: null,
      toast: null,
    };
  }

  getState = () => this.state;

  subscribe = (fn: Listener) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  set(patch: Partial<EditorState>) {
    this.state = { ...this.state, ...patch };
    for (const fn of this.listeners) {
      // One failing listener must never stop the rest of the UI from updating.
      try {
        fn();
      } catch (e) {
        console.error(e);
      }
    }
  }

  private syncDoc(extra: Partial<EditorState> = {}) {
    const doc = this.history.current;
    const ids = new Set([...doc.objects.map((o) => o.id), ...doc.underlays.map((u) => u.id)]);
    const selection = (extra.selection ?? this.state.selection).filter((id) => ids.has(id));
    const activeLayerId = doc.layers.some((l) => l.id === this.state.activeLayerId) ? this.state.activeLayerId : doc.layers[0].id;
    this.set({
      ...extra,
      doc,
      selection,
      activeLayerId,
      canUndo: this.history.undoLabel !== null,
      canRedo: this.history.redoLabel !== null,
      undoLabel: this.history.undoLabel,
      redoLabel: this.history.redoLabel,
    });
  }

  get doc() {
    return this.history.current;
  }

  /** Shows a change while a gesture is in progress, without an undo step. */
  preview(doc: LandscapeDocument, extra?: Partial<EditorState>) {
    this.history.preview(doc);
    this.syncDoc(extra);
  }

  /** Applies a change as one undo step. */
  commit(doc: LandscapeDocument, label: string, extra?: Partial<EditorState>) {
    this.history.commit(doc, label);
    this.syncDoc(extra);
  }

  cancelGesture() {
    this.history.cancelGesture();
    this.syncDoc();
  }

  undo() {
    if (this.history.undo()) {
      this.syncDoc({ nodeSelection: null });
      this.showToast(`Undid: ${this.state.redoLabel}`);
    }
  }

  redo() {
    if (this.history.redo()) {
      this.syncDoc({ nodeSelection: null });
      this.showToast(`Redid: ${this.state.undoLabel}`);
    }
  }

  /** Replaces the document (open file, new plan, restore). */
  load(doc: LandscapeDocument) {
    this.history.reset(doc);
    this.syncDoc({ selection: [], nodeSelection: null });
  }

  select(ids: string[]) {
    this.set({ selection: ids, nodeSelection: null });
  }

  setTool(tool: ToolId) {
    this.set({ tool, hud: null, nodeSelection: tool === "node" ? this.state.nodeSelection : null });
  }

  showToast(text: string) {
    const id = ++this.toastCounter;
    this.set({ toast: { id, text } });
    setTimeout(() => {
      if (this.state.toast?.id === id) this.set({ toast: null });
    }, 2600);
  }
}

export const editor = new Editor();

export function useEditor<T>(selector: (s: EditorState) => T): T {
  return useSyncExternalStore(editor.subscribe, () => selector(editor.getState()));
}
