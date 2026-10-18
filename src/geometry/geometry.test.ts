import { describe, expect, it } from "vitest";
import { fitStroke } from "./fitCurve";
import {
  closestOnPath,
  distanceToPath,
  ellipsePath,
  flatten,
  insertNode,
  pathArea,
  pathLength,
  pointInPolygon,
  rectPath,
  translatePath,
} from "./path";

describe("path measurements", () => {
  it("measures a rectangle", () => {
    const r = rectPath(0, 0, 120, 60);
    expect(pathArea(r)).toBeCloseTo(7200);
    expect(pathLength(r)).toBeCloseTo(360);
  });

  it("normalizes rectangles drawn in any direction", () => {
    expect(pathArea(rectPath(100, 100, -40, -20))).toBeCloseTo(800);
  });

  it("measures a circle to within 0.1%", () => {
    const c = ellipsePath(0, 0, 60, 60);
    expect(pathArea(c) / (Math.PI * 3600)).toBeCloseTo(1, 3);
    expect(pathLength(c) / (2 * Math.PI * 60)).toBeCloseTo(1, 3);
  });

  it("gives open paths no area", () => {
    expect(pathArea({ closed: false, nodes: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }] })).toBe(0);
  });

  it("hit-tests points", () => {
    const poly = flatten(rectPath(0, 0, 10, 10));
    expect(pointInPolygon({ x: 5, y: 5 }, poly)).toBe(true);
    expect(pointInPolygon({ x: 15, y: 5 }, poly)).toBe(false);
    expect(distanceToPath({ x: 5, y: -3 }, rectPath(0, 0, 10, 10))).toBeCloseTo(3);
  });

  it("translates nodes and handles together", () => {
    const moved = translatePath(ellipsePath(0, 0, 10, 10), { x: 5, y: 7 });
    expect(moved.nodes[0]).toMatchObject({ x: 5, y: -3 });
    expect(moved.nodes[0].out!.x).toBeCloseTo(5 + 10 * 0.5522847498);
  });

  it("inserts a node without changing a curve's shape", () => {
    const c = ellipsePath(0, 0, 50, 30);
    const split = insertNode(c, 1, 0.5);
    expect(split.nodes).toHaveLength(5);
    expect(pathArea(split)).toBeCloseTo(pathArea(c), 1);
    const hit = closestOnPath(c, { x: 50, y: 0 });
    expect(hit.distance).toBeLessThan(0.01);
  });
});

describe("fitStroke", () => {
  // A wobbly hand-drawn arc around a 10 ft radius circle.
  const stroke = Array.from({ length: 200 }, (_, i) => {
    const a = (i / 199) * Math.PI;
    const wobble = Math.sin(i * 1.7) * 0.8;
    return { x: Math.cos(a) * (120 + wobble), y: Math.sin(a) * (120 + wobble) };
  });

  it("turns a noisy stroke into a few smooth segments", () => {
    const path = fitStroke(stroke, 3, false);
    expect(path.closed).toBe(false);
    expect(path.nodes.length).toBeGreaterThanOrEqual(2);
    expect(path.nodes.length).toBeLessThan(12);
    // Every original point stays close to the fitted curve.
    for (const p of stroke.filter((_, i) => i % 10 === 0)) expect(distanceToPath(p, path)).toBeLessThan(4);
  });

  it("closes a loop with no kink at the seam", () => {
    const loop = Array.from({ length: 150 }, (_, i) => {
      const a = (i / 150) * Math.PI * 2;
      return { x: Math.cos(a) * 100, y: Math.sin(a) * 60 };
    });
    const path = fitStroke(loop, 2, true);
    expect(path.closed).toBe(true);
    const n0 = path.nodes[0];
    const cross = (n0.out!.x - n0.x) * (n0.in!.y - n0.y) - (n0.out!.y - n0.y) * (n0.in!.x - n0.x);
    expect(Math.abs(cross)).toBeLessThan(1e-6);
    expect(pathArea(path) / (Math.PI * 6000)).toBeCloseTo(1, 1);
  });
});
