import { pathArea, pathLength } from "../geometry/path";
import type { LandscapeDocument, Material, QuantityUnit } from "./types";
import { toCubicYards, toSquareFeet } from "./units";

export interface QuantityRow {
  material: Material;
  shapeCount: number;
  /** Total plan area, square inches. */
  area: number;
  /** Total edge length, inches (useful for edging). */
  perimeter: number;
  /** Amount in the material's billing unit (sq ft or cu yd). */
  quantity: number;
  unit: QuantityUnit;
  cost: number;
}

export interface QuantityTakeoff {
  rows: QuantityRow[];
  total: number;
}

/** Computes the live takeoff: every number comes straight from the drawn shapes. */
export function computeQuantities(doc: LandscapeDocument): QuantityTakeoff {
  const byMaterial = new Map<string, QuantityRow>();
  const materials = new Map(doc.materials.map((m) => [m.id, m]));
  for (const shape of doc.objects) {
    if (!shape.materialId || !shape.path.closed) continue;
    const material = materials.get(shape.materialId);
    if (!material) continue;
    let row = byMaterial.get(material.id);
    if (!row) {
      row = { material, shapeCount: 0, area: 0, perimeter: 0, quantity: 0, unit: material.unit, cost: 0 };
      byMaterial.set(material.id, row);
    }
    row.shapeCount += 1;
    row.area += pathArea(shape.path);
    row.perimeter += pathLength(shape.path);
  }
  const rows = [...byMaterial.values()];
  for (const row of rows) {
    row.quantity = row.unit === "cuyd" ? toCubicYards(row.area * row.material.depth) : toSquareFeet(row.area);
    row.cost = row.quantity * row.material.unitCost;
  }
  rows.sort((a, b) => a.material.category.localeCompare(b.material.category) || a.material.name.localeCompare(b.material.name));
  return { rows, total: rows.reduce((s, r) => s + r.cost, 0) };
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** A bid sheet as CSV, ready for a spreadsheet. */
export function quantitiesToCsv(doc: LandscapeDocument): string {
  const { rows, total } = computeQuantities(doc);
  const lines = [["Category", "Item", "Quantity", "Unit", "Depth (in)", "Area (sq ft)", "Edge length (ft)", "Unit cost", "Line total"]];
  for (const r of rows) {
    lines.push([
      r.material.category,
      r.material.name,
      r.quantity.toFixed(r.unit === "cuyd" ? 2 : 0),
      r.unit === "cuyd" ? "cu yd" : "sq ft",
      r.unit === "cuyd" ? String(r.material.depth) : "",
      toSquareFeet(r.area).toFixed(0),
      (r.perimeter / 12).toFixed(0),
      r.material.unitCost.toFixed(2),
      r.cost.toFixed(2),
    ]);
  }
  lines.push(["", "Total", "", "", "", "", "", "", total.toFixed(2)]);
  return lines.map((l) => l.map(csvCell).join(",")).join("\n") + "\n";
}
