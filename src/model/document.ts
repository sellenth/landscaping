import { BUILT_IN_MATERIALS } from "./materials";
import { CURRENT_VERSION, FILE_FORMAT, type LandscapeDocument } from "./types";

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createDocument(name = "Untitled plan"): LandscapeDocument {
  return {
    format: FILE_FORMAT,
    version: CURRENT_VERSION,
    name,
    layers: [
      // Bottom to top: lawn and beds sit under patios and paths.
      { id: "layer-base", name: "Base plan", visible: true, locked: false },
      { id: "layer-planting", name: "Planting & lawn", visible: true, locked: false },
      { id: "layer-hardscape", name: "Hardscape", visible: true, locked: false },
    ],
    objects: [],
    underlays: [],
    materials: structuredClone(BUILT_IN_MATERIALS),
  };
}
