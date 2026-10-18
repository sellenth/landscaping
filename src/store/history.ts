import type { LandscapeDocument } from "../model/types";

const MAX_UNDO = 300;

/**
 * Undo/redo over immutable document snapshots. Documents are never mutated,
 * so each snapshot shares unchanged objects with its neighbours and costs
 * little memory.
 *
 * Gestures (dragging a shape, a node, a handle) call `preview` repeatedly and
 * `commit` once at the end, so a whole drag is a single undo step.
 */
export class History {
  private undoStack: { doc: LandscapeDocument; label: string }[] = [];
  private redoStack: { doc: LandscapeDocument; label: string }[] = [];
  private gestureBase: LandscapeDocument | null = null;

  constructor(public current: LandscapeDocument) {}

  /** Shows a change without recording it yet (used while dragging). */
  preview(next: LandscapeDocument) {
    if (!this.gestureBase) this.gestureBase = this.current;
    this.current = next;
  }

  /** Records a change as one undo step. */
  commit(next: LandscapeDocument, label: string) {
    const base = this.gestureBase ?? this.current;
    this.gestureBase = null;
    this.current = next;
    if (base === next) return;
    this.undoStack.push({ doc: base, label });
    if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
    this.redoStack = [];
  }

  /** Abandons a previewed gesture and restores the document from before it. */
  cancelGesture() {
    if (this.gestureBase) {
      this.current = this.gestureBase;
      this.gestureBase = null;
    }
  }

  get inGesture() {
    return this.gestureBase !== null;
  }

  undo(): boolean {
    this.cancelGesture();
    const entry = this.undoStack.pop();
    if (!entry) return false;
    this.redoStack.push({ doc: this.current, label: entry.label });
    this.current = entry.doc;
    return true;
  }

  redo(): boolean {
    this.cancelGesture();
    const entry = this.redoStack.pop();
    if (!entry) return false;
    this.undoStack.push({ doc: this.current, label: entry.label });
    this.current = entry.doc;
    return true;
  }

  /** Replaces everything, e.g. after opening a file. */
  reset(doc: LandscapeDocument) {
    this.current = doc;
    this.undoStack = [];
    this.redoStack = [];
    this.gestureBase = null;
  }

  get undoLabel() {
    return this.undoStack[this.undoStack.length - 1]?.label ?? null;
  }

  get redoLabel() {
    return this.redoStack[this.redoStack.length - 1]?.label ?? null;
  }
}
