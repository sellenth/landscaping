import type { Path } from "../geometry/path";

/** Bump this and add a step in migrate.ts whenever the saved shape changes. */
export const CURRENT_VERSION = 1;
export const FILE_FORMAT = "landscaping";

export type PatternSpec =
  | { kind: "solid" }
  | { kind: "runningBond"; length: number; width: number }
  | { kind: "herringbone"; length: number; width: number }
  | { kind: "stackBond"; length: number; width: number }
  | { kind: "flagstone"; size: number }
  | { kind: "gravel"; size: number }
  | { kind: "riverRock"; size: number }
  | { kind: "lawn"; spacing: number }
  | { kind: "mulch"; spacing: number }
  | { kind: "boards"; width: number; length: number }
  | { kind: "concrete"; joint: number }
  | { kind: "water"; spacing: number };

/** How a material is counted in the quantities and bid. */
export type QuantityUnit = "sqft" | "cuyd";

export type MaterialCategory = "Hardscape" | "Aggregate" | "Planting" | "Lawn" | "Water";

export interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  /** Base fill color, light theme. */
  color: string;
  /** Joint/line color drawn over the fill. */
  lineColor: string;
  pattern: PatternSpec;
  /** Default pattern rotation in degrees (herringbone is usually laid at 45°). */
  patternAngle: number;
  unit: QuantityUnit;
  /** Installed depth in inches. Used for cubic-yard materials. */
  depth: number;
  /** Price per unit (per sq ft or per cu yd), in dollars. */
  unitCost: number;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

export interface Shape {
  id: string;
  type: "shape";
  name: string;
  layerId: string;
  path: Path;
  /** null means an outline with no fill (e.g. a property line or sketch). */
  materialId: string | null;
  /** Extra pattern rotation in degrees, added to the material's own angle. */
  patternAngle: number;
  /** Elevation of the bottom of the object, inches. Used by future 3D views. */
  baseElevation: number;
  /** Height or thickness, inches. Used by future 3D views. */
  height: number;
}

export interface Underlay {
  id: string;
  type: "underlay";
  name: string;
  /** Image data URL. */
  src: string;
  /** Top-left corner in model units. */
  x: number;
  y: number;
  /** Size in model units (inches). */
  width: number;
  height: number;
  opacity: number;
  locked: boolean;
}

export type SceneObject = Shape | Underlay;

export interface LandscapeDocument {
  format: typeof FILE_FORMAT;
  version: number;
  name: string;
  layers: Layer[];
  /** Drawn in order: first is at the bottom. Underlays are always drawn below shapes. */
  objects: Shape[];
  underlays: Underlay[];
  materials: Material[];
}
