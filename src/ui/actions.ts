// Commands shared by the toolbar, menus and keyboard shortcuts.

import type { Vec } from "../geometry/vec";
import { createDocument, newId } from "../model/document";
import { serializeDocument } from "../model/migrate";
import { addUnderlay, deleteObjects, duplicateShapes, moveObjects, reorderShapes } from "../model/ops";
import { quantitiesToCsv } from "../model/quantities";
import { editor } from "../store/editor";
import { DocumentLoadError, downloadFile, pickFile, readPlanFile, safeFileName } from "../store/persist";
import { fitView, zoomAt } from "./viewMath";

const PLAN_EXTENSION = ".landscape.json";

function canvasSize() {
  const c = document.querySelector<HTMLCanvasElement>("[data-testid=plan-canvas]");
  const r = c?.getBoundingClientRect();
  return { w: r?.width ?? 1000, h: r?.height ?? 700 };
}

export function newPlan() {
  editor.load(createDocument());
  const { w, h } = canvasSize();
  fitView(editor, w, h);
  editor.showToast("New plan started. Undo history was cleared; your last plan is still in its saved file if you saved one.");
}

export function savePlan() {
  const doc = editor.doc;
  downloadFile(`${safeFileName(doc.name)}${PLAN_EXTENSION}`, serializeDocument(doc), "application/json");
  editor.showToast("Plan file downloaded");
}

export async function openPlan(file?: File) {
  const f = file ?? (await pickFile(".json,application/json"));
  if (!f) return;
  try {
    const doc = await readPlanFile(f);
    editor.load(doc);
    const { w, h } = canvasSize();
    fitView(editor, w, h);
    editor.showToast(`Opened "${doc.name}"`);
  } catch (e) {
    editor.showToast(e instanceof DocumentLoadError ? e.message : "That file couldn't be opened.");
  }
}

export function exportBidCsv() {
  const doc = editor.doc;
  downloadFile(`${safeFileName(doc.name)}-quantities.csv`, quantitiesToCsv(doc), "text/csv");
  editor.showToast("Bid sheet downloaded as CSV");
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function imageSize(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => reject(new Error("bad image"));
    img.src = src;
  });
}

/** Adds an image (survey, aerial, scanned sketch) under the drawing. */
export async function importImage(file?: File, at?: Vec) {
  const f = file ?? (await pickFile("image/*"));
  if (!f) return;
  if (f.type === "application/pdf") {
    editor.showToast("PDF import is coming soon. For now, export the PDF page as a PNG or JPG and import that.");
    return;
  }
  try {
    const src = await readAsDataUrl(f);
    const { w, h } = await imageSize(src);
    const view = editor.getState().view;
    const canvas = canvasSize();
    // Fill most of the view; the user sets the true scale afterwards.
    const width = (canvas.w * 0.7) / view.scale;
    const height = (width * h) / w;
    const center = at ?? { x: (canvas.w / 2 - view.ox) / view.scale, y: (canvas.h / 2 - view.oy) / view.scale };
    const underlay = {
      id: newId(),
      type: "underlay" as const,
      name: f.name.replace(/\.[^.]+$/, ""),
      src,
      x: center.x - width / 2,
      y: center.y - height / 2,
      width,
      height,
      opacity: 0.65,
      locked: false,
    };
    editor.commit(addUnderlay(editor.doc, underlay), "Import image", { selection: [underlay.id], tool: "select" });
    editor.showToast("Image added. Click Set scale and pick two points with a known distance.");
  } catch {
    editor.showToast("That image couldn't be read. Try a PNG or JPG.");
  }
}

export async function handleDroppedFiles(files: File[], at: Vec) {
  for (const f of files) {
    if (f.name.endsWith(".json")) await openPlan(f);
    else await importImage(f, at);
  }
}

export function deleteSelection() {
  const { selection } = editor.getState();
  if (selection.length === 0) return;
  editor.commit(deleteObjects(editor.doc, selection), selection.length > 1 ? `Delete ${selection.length} objects` : "Delete", { selection: [] });
}

export function duplicateSelection() {
  const { selection, view } = editor.getState();
  const shapeIds = selection.filter((id) => editor.doc.objects.some((o) => o.id === id));
  if (shapeIds.length === 0) return;
  const offset = 16 / view.scale;
  const r = duplicateShapes(editor.doc, shapeIds, { x: offset, y: offset });
  editor.commit(r.doc, "Duplicate", { selection: r.ids });
}

export function nudgeSelection(dx: number, dy: number) {
  const { selection } = editor.getState();
  if (selection.length === 0) return;
  editor.commit(moveObjects(editor.doc, selection, { x: dx, y: dy }), "Nudge");
}

export function selectAll() {
  const doc = editor.doc;
  const blocked = new Set(doc.layers.filter((l) => !l.visible || l.locked).map((l) => l.id));
  editor.select(doc.objects.filter((o) => !blocked.has(o.layerId)).map((o) => o.id));
}

export function reorderSelection(direction: 1 | -1) {
  const { selection } = editor.getState();
  if (selection.length === 0) return;
  editor.commit(reorderShapes(editor.doc, selection, direction), direction === 1 ? "Bring to front" : "Send to back");
}

export function zoomToFit() {
  const { w, h } = canvasSize();
  fitView(editor, w, h);
}

export function zoomBy(factor: number) {
  const { w, h } = canvasSize();
  editor.set({ view: zoomAt(editor.getState().view, { x: w / 2, y: h / 2 }, factor) });
}
