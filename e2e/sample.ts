import { ellipsePath, rectPath, type Path } from "../src/geometry/path";
import { fitStroke } from "../src/geometry/fitCurve";
import { createDocument } from "../src/model/document";
import { makeShape } from "../src/model/ops";
import type { LandscapeDocument } from "../src/model/types";

const ft = (n: number) => n * 12;

/** A loop through the given points (in feet), drawn as a smooth bed line. */
function blob(points: [number, number][]): Path {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    for (let k = 0; k < 10; k++) pts.push({ x: ft(a[0] + ((b[0] - a[0]) * k) / 10), y: ft(a[1] + ((b[1] - a[1]) * k) / 10) });
  }
  return fitStroke(pts, 6, true);
}

/** A sample backyard used by screenshots and the demo. */
export function sampleDocument(): LandscapeDocument {
  const doc = createDocument("Henderson backyard (sample)");
  const add = (path: Path, layer: string, material: string | null, name: string, angle = 0) => {
    const s = makeShape(path, layer, material, name);
    s.patternAngle = angle;
    doc.objects.push(s);
  };
  add({ closed: true, nodes: [[-10, -40], [110, -40], [110, 70], [-10, 70]].map(([x, y]) => ({ x: ft(x), y: ft(y) })) }, "layer-base", null, "Property line");
  add(blob([[-8, 8], [30, 2], [70, 6], [104, 0], [106, 66], [60, 68], [0, 66]]), "layer-planting", "lawn", "Lawn");
  add(rectPath(ft(20), ft(-36), ft(50), ft(30)), "layer-base", null, "House");
  add(rectPath(ft(72), ft(-38), ft(20), ft(36)), "layer-hardscape", "concrete", "Driveway");
  add(rectPath(ft(28), ft(-6), ft(26), ft(16)), "layer-hardscape", "paver-herringbone", "Patio");
  add(rectPath(ft(54), ft(-6), ft(14), ft(10)), "layer-hardscape", "deck", "Deck");
  add(blob([[30, 12], [44, 14], [52, 24], [46, 34], [38, 30], [32, 20]]), "layer-hardscape", "flagstone", "Flagstone landing");
  add(blob([[-6, 10], [16, 8], [26, 16], [22, 30], [8, 40], [-6, 36]]), "layer-planting", "bark-mulch", "Bed A");
  add(blob([[66, 12], [100, 6], [104, 40], [90, 34], [78, 24]]), "layer-planting", "bark-mulch", "Bed B");
  add(blob([[46, 44], [80, 42], [96, 50], [104, 64], [60, 64], [40, 60]]), "layer-planting", "decomposed-granite", "Fire pit court");
  add(blob([[8, 46], [20, 50], [30, 56], [26, 62], [12, 60], [2, 54]]), "layer-planting", "river-rock", "Dry creek");
  add(ellipsePath(ft(68), ft(54), ft(5), ft(5)), "layer-hardscape", "crushed-gravel", "Fire pit");
  add(ellipsePath(ft(10), ft(24), ft(4), ft(3)), "layer-hardscape", "water", "Water feature");
  add(rectPath(ft(56), ft(18), ft(12), ft(8)), "layer-hardscape", "paver-running-bond", "Grill pad");
  add(rectPath(ft(36), ft(48), ft(8), ft(12)), "layer-hardscape", "paver-large-format", "Bench pad");
  return doc;
}
