import type { Path } from "../geometry/path";
import { addShape, makeShape } from "../model/ops";
import type { Hud } from "../store/editor";
import { DIMENSION_CHARS, type ToolHost } from "./tool";

/** Adds a newly drawn shape on the active layer and selects it. */
export function createShape(host: ToolHost, path: Path, name: string): boolean {
  const { editor } = host;
  const state = editor.getState();
  const layer = state.doc.layers.find((l) => l.id === state.activeLayerId);
  if (!layer || layer.locked || !layer.visible) {
    editor.showToast(`The "${layer?.name ?? "active"}" layer is ${layer?.locked ? "locked" : "hidden"}. Pick another layer to draw on.`);
    return false;
  }
  const materialId = path.closed ? state.activeMaterialId : null;
  const shape = makeShape(path, layer.id, materialId, name);
  editor.commit(addShape(state.doc, shape), `Draw ${name.toLowerCase()}`, { selection: [shape.id] });
  return true;
}

/**
 * Typed dimensions while drawing: start typing a length (12'6", 30, 4m) and
 * press Tab to move between fields, Enter to apply.
 */
export class DimensionInput {
  values: string[];
  active = 0;

  constructor(private labels: string[], private hint: string) {
    this.values = labels.map(() => "");
  }

  reset() {
    this.values = this.labels.map(() => "");
    this.active = 0;
  }

  get typing() {
    return this.values.some((v) => v !== "");
  }

  /** Returns "enter" when the user confirms, "changed" on edits, or null if the key isn't ours. */
  handleKey(e: KeyboardEvent): "enter" | "changed" | null {
    if (e.metaKey || e.ctrlKey) return null;
    if (e.key === "Enter") return "enter";
    if (e.key === "Tab" && this.labels.length > 1) {
      this.active = (this.active + (e.shiftKey ? this.labels.length - 1 : 1)) % this.labels.length;
      return "changed";
    }
    if (e.key === "Backspace" && this.values[this.active] !== "") {
      this.values[this.active] = this.values[this.active].slice(0, -1);
      return "changed";
    }
    if (e.key.length === 1 && DIMENSION_CHARS.test(e.key)) {
      if (e.key === " " && this.values[this.active] === "") return null;
      this.values[this.active] += e.key;
      return "changed";
    }
    return null;
  }

  hud(placeholders: string[]): Hud {
    return {
      fields: this.labels.map((label, i) => ({
        label,
        text: this.values[i],
        active: i === this.active,
        placeholder: placeholders[i] ?? "",
      })),
      hint: this.hint,
    };
  }
}
