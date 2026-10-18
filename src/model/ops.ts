// Pure document edits. Every function returns a new document and never
// mutates its input, which is what makes undo/redo cheap and reliable.

import { type Path, translatePath } from "../geometry/path";
import type { Vec } from "../geometry/vec";
import { newId } from "./document";
import type { Layer, LandscapeDocument, Material, Shape, Underlay } from "./types";

export function addShape(doc: LandscapeDocument, shape: Shape): LandscapeDocument {
  return { ...doc, objects: [...doc.objects, shape] };
}

export function makeShape(path: Path, layerId: string, materialId: string | null, name: string): Shape {
  return { id: newId(), type: "shape", name, layerId, path, materialId, patternAngle: 0, baseElevation: 0, height: 0 };
}

export function updateShapes(doc: LandscapeDocument, ids: Iterable<string>, patch: Partial<Shape> | ((s: Shape) => Partial<Shape>)): LandscapeDocument {
  const set = new Set(ids);
  let changed = false;
  const objects = doc.objects.map((s) => {
    if (!set.has(s.id)) return s;
    changed = true;
    return { ...s, ...(typeof patch === "function" ? patch(s) : patch) };
  });
  return changed ? { ...doc, objects } : doc;
}

export function updateUnderlay(doc: LandscapeDocument, id: string, patch: Partial<Underlay>): LandscapeDocument {
  return { ...doc, underlays: doc.underlays.map((u) => (u.id === id ? { ...u, ...patch } : u)) };
}

export function addUnderlay(doc: LandscapeDocument, underlay: Underlay): LandscapeDocument {
  return { ...doc, underlays: [...doc.underlays, underlay] };
}

export function deleteObjects(doc: LandscapeDocument, ids: Iterable<string>): LandscapeDocument {
  const set = new Set(ids);
  return {
    ...doc,
    objects: doc.objects.filter((o) => !set.has(o.id)),
    underlays: doc.underlays.filter((u) => !set.has(u.id)),
  };
}

export function moveObjects(doc: LandscapeDocument, ids: Iterable<string>, d: Vec): LandscapeDocument {
  const set = new Set(ids);
  return {
    ...doc,
    objects: doc.objects.map((s) => (set.has(s.id) ? { ...s, path: translatePath(s.path, d) } : s)),
    underlays: doc.underlays.map((u) => (set.has(u.id) && !u.locked ? { ...u, x: u.x + d.x, y: u.y + d.y } : u)),
  };
}

/** Copies shapes, offset slightly, and returns the new document plus the copies' ids. */
export function duplicateShapes(doc: LandscapeDocument, ids: Iterable<string>, offset: Vec): { doc: LandscapeDocument; ids: string[] } {
  const set = new Set(ids);
  const copies = doc.objects
    .filter((s) => set.has(s.id))
    .map((s) => ({ ...s, id: newId(), path: translatePath(s.path, offset) }));
  return { doc: { ...doc, objects: [...doc.objects, ...copies] }, ids: copies.map((c) => c.id) };
}

/** Moves shapes to the top (+1) or bottom (-1) of the drawing order. */
export function reorderShapes(doc: LandscapeDocument, ids: Iterable<string>, direction: 1 | -1): LandscapeDocument {
  const set = new Set(ids);
  const picked = doc.objects.filter((s) => set.has(s.id));
  const rest = doc.objects.filter((s) => !set.has(s.id));
  return { ...doc, objects: direction === 1 ? [...rest, ...picked] : [...picked, ...rest] };
}

export function updateMaterial(doc: LandscapeDocument, id: string, patch: Partial<Material>): LandscapeDocument {
  return { ...doc, materials: doc.materials.map((m) => (m.id === id ? { ...m, ...patch } : m)) };
}

export function addLayer(doc: LandscapeDocument, name: string): { doc: LandscapeDocument; id: string } {
  const layer: Layer = { id: newId(), name, visible: true, locked: false };
  return { doc: { ...doc, layers: [...doc.layers, layer] }, id: layer.id };
}

export function updateLayer(doc: LandscapeDocument, id: string, patch: Partial<Layer>): LandscapeDocument {
  return { ...doc, layers: doc.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) };
}

/** Deletes a layer and moves its shapes to the first remaining layer. */
export function deleteLayer(doc: LandscapeDocument, id: string): LandscapeDocument {
  const layers = doc.layers.filter((l) => l.id !== id);
  if (layers.length === 0) return doc;
  return {
    ...doc,
    layers,
    objects: doc.objects.map((s) => (s.layerId === id ? { ...s, layerId: layers[0].id } : s)),
  };
}
