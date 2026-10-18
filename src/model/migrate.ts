import { BUILT_IN_MATERIALS } from "./materials";
import { CURRENT_VERSION, FILE_FORMAT, type LandscapeDocument, type Shape } from "./types";

export class DocumentLoadError extends Error {}

/**
 * Each entry upgrades a document from version N to N+1. Old files must
 * always open, so steps are never removed, only added.
 */
const MIGRATIONS: Record<number, (doc: Record<string, unknown>) => Record<string, unknown>> = {
  // 1: (doc) => ({ ...doc, version: 2, newField: defaultValue }),
};

/** Parses and upgrades a saved project. Throws DocumentLoadError with a readable message. */
export function loadDocument(raw: unknown): LandscapeDocument {
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      throw new DocumentLoadError("This file isn't a landscape plan (it isn't valid JSON).");
    }
  }
  if (!raw || typeof raw !== "object") throw new DocumentLoadError("This file isn't a landscape plan.");
  let doc = raw as Record<string, unknown>;
  if (doc.format !== FILE_FORMAT) throw new DocumentLoadError("This file isn't a landscape plan.");
  if (typeof doc.version !== "number" || !Number.isInteger(doc.version) || doc.version < 1) {
    throw new DocumentLoadError("This plan file is damaged: its version number is missing.");
  }
  if (doc.version > CURRENT_VERSION) {
    throw new DocumentLoadError(
      `This plan was saved by a newer version of the app (file version ${doc.version}). Update the app to open it.`,
    );
  }
  while ((doc.version as number) < CURRENT_VERSION) {
    const step = MIGRATIONS[doc.version as number];
    if (!step) throw new DocumentLoadError(`No upgrade path from file version ${doc.version}.`);
    doc = step(doc);
  }
  return normalize(doc);
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Fills in defaults and drops anything malformed, so one bad object can't break a whole plan. */
function normalize(doc: Record<string, unknown>): LandscapeDocument {
  const layers = Array.isArray(doc.layers) ? (doc.layers as LandscapeDocument["layers"]) : [];
  if (layers.length === 0) layers.push({ id: "layer-base", name: "Base plan", visible: true, locked: false });
  const layerIds = new Set(layers.map((l) => l.id));

  const materials = Array.isArray(doc.materials) && doc.materials.length > 0
    ? (doc.materials as LandscapeDocument["materials"])
    : structuredClone(BUILT_IN_MATERIALS);

  const objects = (Array.isArray(doc.objects) ? doc.objects : [])
    .filter((o): o is Shape => {
      const s = o as Shape;
      return (
        !!s && s.type === "shape" && typeof s.id === "string" && !!s.path && Array.isArray(s.path.nodes) &&
        s.path.nodes.every((n) => isNum(n.x) && isNum(n.y))
      );
    })
    .map((s) => ({
      ...s,
      name: typeof s.name === "string" ? s.name : "Shape",
      layerId: layerIds.has(s.layerId) ? s.layerId : layers[0].id,
      materialId: typeof s.materialId === "string" ? s.materialId : null,
      patternAngle: isNum(s.patternAngle) ? s.patternAngle : 0,
      baseElevation: isNum(s.baseElevation) ? s.baseElevation : 0,
      height: isNum(s.height) ? s.height : 0,
    }));

  const underlays = (Array.isArray(doc.underlays) ? doc.underlays : []).filter(
    (u) => !!u && (u as { type?: string }).type === "underlay" && typeof (u as { src?: string }).src === "string",
  ) as LandscapeDocument["underlays"];

  return {
    format: FILE_FORMAT,
    version: CURRENT_VERSION,
    name: typeof doc.name === "string" && doc.name.trim() ? doc.name : "Untitled plan",
    layers,
    objects,
    underlays,
    materials,
  };
}

export function serializeDocument(doc: LandscapeDocument): string {
  return JSON.stringify(doc);
}
