import { describe, expect, it } from "vitest";
import { rectPath } from "../geometry/path";
import { History } from "../store/history";
import { createDocument } from "./document";
import { DocumentLoadError, loadDocument, serializeDocument } from "./migrate";
import { computeQuantities, quantitiesToCsv } from "./quantities";
import type { LandscapeDocument, Shape } from "./types";

function shape(id: string, materialId: string | null, w: number, h: number): Shape {
  return {
    id,
    type: "shape",
    name: id,
    layerId: "layer-hardscape",
    path: rectPath(0, 0, w, h),
    materialId,
    patternAngle: 0,
    baseElevation: 0,
    height: 0,
  };
}

const withObjects = (doc: LandscapeDocument, objects: Shape[]): LandscapeDocument => ({ ...doc, objects });

describe("quantities", () => {
  it("bills paving by square foot and mulch by cubic yard", () => {
    const doc = withObjects(createDocument(), [
      shape("patio", "flagstone", 20 * 12, 15 * 12), // 300 sq ft
      shape("bed", "bark-mulch", 36 * 12, 9 * 12), // 324 sq ft at 3" = 3 cu yd
      shape("outline", null, 100, 100),
    ]);
    const { rows, total } = computeQuantities(doc);
    const patio = rows.find((r) => r.material.id === "flagstone")!;
    const bed = rows.find((r) => r.material.id === "bark-mulch")!;
    expect(rows).toHaveLength(2);
    expect(patio.quantity).toBeCloseTo(300);
    expect(patio.cost).toBeCloseTo(300 * 18);
    expect(bed.quantity).toBeCloseTo(3);
    expect(bed.cost).toBeCloseTo(3 * 65);
    expect(total).toBeCloseTo(300 * 18 + 3 * 65);
  });

  it("adds up multiple shapes of the same material", () => {
    const doc = withObjects(createDocument(), [shape("a", "lawn", 120, 120), shape("b", "lawn", 120, 120)]);
    expect(computeQuantities(doc).rows[0]).toMatchObject({ shapeCount: 2, quantity: 200 });
  });

  it("exports a bid CSV", () => {
    const doc = withObjects(createDocument(), [shape("patio", "flagstone", 120, 120)]);
    const csv = quantitiesToCsv(doc);
    expect(csv.split("\n")[0]).toContain("Unit cost");
    expect(csv).toContain("Flagstone patio,100,sq ft");
    expect(csv).toContain("Total,,,,,,,1800.00");
  });
});

describe("file format", () => {
  it("round-trips a document", () => {
    const doc = withObjects(createDocument("Smith residence"), [shape("patio", "flagstone", 120, 120)]);
    expect(loadDocument(serializeDocument(doc))).toEqual(doc);
  });

  it("refuses files from a newer version with a clear message", () => {
    const future = { ...createDocument(), version: 999 };
    expect(() => loadDocument(future)).toThrow(/newer version/);
  });

  it("refuses things that aren't plans", () => {
    expect(() => loadDocument("not json")).toThrow(DocumentLoadError);
    expect(() => loadDocument({ hello: "world" })).toThrow(DocumentLoadError);
  });

  it("drops a damaged object instead of failing the whole plan", () => {
    const doc = createDocument() as unknown as Record<string, unknown>;
    doc.objects = [shape("good", "lawn", 10, 10), { type: "shape", id: "bad", path: { nodes: [{ x: "nope" }] } }];
    const loaded = loadDocument(doc);
    expect(loaded.objects.map((o) => o.id)).toEqual(["good"]);
  });
});

describe("History", () => {
  it("undoes and redoes", () => {
    const a = createDocument("a");
    const b = { ...a, name: "b" };
    const c = { ...a, name: "c" };
    const h = new History(a);
    h.commit(b, "Rename");
    h.commit(c, "Rename");
    expect(h.undo()).toBe(true);
    expect(h.current.name).toBe("b");
    expect(h.undo()).toBe(true);
    expect(h.current.name).toBe("a");
    expect(h.undo()).toBe(false);
    h.redo();
    expect(h.current.name).toBe("b");
  });

  it("records a whole drag as one step", () => {
    const a = createDocument("a");
    const h = new History(a);
    h.preview({ ...a, name: "1" });
    h.preview({ ...a, name: "2" });
    h.commit({ ...a, name: "3" }, "Move");
    expect(h.undoLabel).toBe("Move");
    h.undo();
    expect(h.current).toBe(a);
  });

  it("clears redo after a new change", () => {
    const a = createDocument("a");
    const h = new History(a);
    h.commit({ ...a, name: "b" }, "x");
    h.undo();
    h.commit({ ...a, name: "c" }, "y");
    expect(h.redo()).toBe(false);
  });
});
