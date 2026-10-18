// Turns a rough freehand stroke into a few smooth cubic Bézier segments.
// Based on Philip J. Schneider, "An Algorithm for Automatically Fitting
// Digitized Curves" (Graphics Gems, 1990).

import type { Path, PathNode, Segment } from "./path";
import { type Vec, add, dist, dot, normalize, scale, sub } from "./vec";

/** Light smoothing to take the shake out of a mouse-drawn line. */
export function smoothStroke(points: Vec[], passes = 2, closed = false): Vec[] {
  let pts = points;
  for (let k = 0; k < passes; k++) {
    const n = pts.length;
    pts = pts.map((p, i) => {
      if (!closed && (i === 0 || i === n - 1)) return p;
      const a = pts[(i - 1 + n) % n];
      const b = pts[(i + 1) % n];
      return { x: (a.x + 2 * p.x + b.x) / 4, y: (a.y + 2 * p.y + b.y) / 4 };
    });
  }
  return pts;
}

/** Drops points closer together than `minDist`, keeping the last one. */
export function dedupe(points: Vec[], minDist: number): Vec[] {
  const out: Vec[] = [];
  for (const p of points) {
    if (out.length === 0 || dist(out[out.length - 1], p) >= minDist) out.push(p);
  }
  const last = points[points.length - 1];
  if (last && out[out.length - 1] !== last && out.length > 1) out[out.length - 1] = last;
  return out;
}

export function fitCubics(points: Vec[], maxError: number): Segment[] {
  if (points.length < 2) return [];
  const tHat1 = normalize(sub(points[1], points[0]));
  const tHat2 = normalize(sub(points[points.length - 2], points[points.length - 1]));
  return fitCubic(points, 0, points.length - 1, tHat1, tHat2, maxError, 0);
}

function fitCubic(pts: Vec[], first: number, last: number, tHat1: Vec, tHat2: Vec, error: number, depth: number): Segment[] {
  const nPts = last - first + 1;
  if (nPts === 2) {
    const d = dist(pts[first], pts[last]) / 3;
    return [[pts[first], add(pts[first], scale(tHat1, d)), add(pts[last], scale(tHat2, d)), pts[last]]];
  }

  let u = chordLengthParameterize(pts, first, last);
  let bez = generateBezier(pts, first, last, u, tHat1, tHat2);
  let { maxError, splitPoint } = computeMaxError(pts, first, last, bez, u);
  if (maxError < error) return [bez];

  if (maxError < error * 4) {
    for (let i = 0; i < 20; i++) {
      const uPrime = reparameterize(pts, first, u, bez);
      bez = generateBezier(pts, first, last, uPrime, tHat1, tHat2);
      ({ maxError, splitPoint } = computeMaxError(pts, first, last, bez, uPrime));
      if (maxError < error) return [bez];
      u = uPrime;
    }
  }

  if (depth > 40) return [bez];
  splitPoint = Math.max(first + 1, Math.min(last - 1, splitPoint));
  const center = normalize(sub(pts[splitPoint - 1], pts[splitPoint + 1]));
  return [
    ...fitCubic(pts, first, splitPoint, tHat1, center, error, depth + 1),
    ...fitCubic(pts, splitPoint, last, scale(center, -1), tHat2, error, depth + 1),
  ];
}

function generateBezier(pts: Vec[], first: number, last: number, u: number[], tHat1: Vec, tHat2: Vec): Segment {
  const p0 = pts[first];
  const p3 = pts[last];
  const C = [[0, 0], [0, 0]];
  const X = [0, 0];
  for (let i = 0; i < u.length; i++) {
    const t = u[i];
    const mt = 1 - t;
    const a1 = scale(tHat1, 3 * mt * mt * t);
    const a2 = scale(tHat2, 3 * mt * t * t);
    C[0][0] += dot(a1, a1);
    C[0][1] += dot(a1, a2);
    C[1][1] += dot(a2, a2);
    const b0 = mt * mt * mt, b1 = 3 * mt * mt * t, b2 = 3 * mt * t * t, b3 = t * t * t;
    const tmp = sub(pts[first + i], {
      x: p0.x * (b0 + b1) + p3.x * (b2 + b3),
      y: p0.y * (b0 + b1) + p3.y * (b2 + b3),
    });
    X[0] += dot(a1, tmp);
    X[1] += dot(a2, tmp);
  }
  C[1][0] = C[0][1];
  const detC0C1 = C[0][0] * C[1][1] - C[1][0] * C[0][1];
  const detC0X = C[0][0] * X[1] - C[1][0] * X[0];
  const detXC1 = X[0] * C[1][1] - X[1] * C[0][1];
  let alphaL = detC0C1 === 0 ? 0 : detXC1 / detC0C1;
  let alphaR = detC0C1 === 0 ? 0 : detC0X / detC0C1;

  const segLength = dist(p0, p3);
  const epsilon = 1e-6 * segLength;
  if (alphaL < epsilon || alphaR < epsilon) {
    alphaL = alphaR = segLength / 3;
  }
  return [p0, add(p0, scale(tHat1, alphaL)), add(p3, scale(tHat2, alphaR)), p3];
}

function q(b: Segment, t: number): Vec {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * b[0].x + 3 * mt * mt * t * b[1].x + 3 * mt * t * t * b[2].x + t * t * t * b[3].x,
    y: mt * mt * mt * b[0].y + 3 * mt * mt * t * b[1].y + 3 * mt * t * t * b[2].y + t * t * t * b[3].y,
  };
}

function qPrime(b: Segment, t: number): Vec {
  const mt = 1 - t;
  return {
    x: 3 * mt * mt * (b[1].x - b[0].x) + 6 * mt * t * (b[2].x - b[1].x) + 3 * t * t * (b[3].x - b[2].x),
    y: 3 * mt * mt * (b[1].y - b[0].y) + 6 * mt * t * (b[2].y - b[1].y) + 3 * t * t * (b[3].y - b[2].y),
  };
}

function qPrimePrime(b: Segment, t: number): Vec {
  return {
    x: 6 * (1 - t) * (b[2].x - 2 * b[1].x + b[0].x) + 6 * t * (b[3].x - 2 * b[2].x + b[1].x),
    y: 6 * (1 - t) * (b[2].y - 2 * b[1].y + b[0].y) + 6 * t * (b[3].y - 2 * b[2].y + b[1].y),
  };
}

function reparameterize(pts: Vec[], first: number, u: number[], bez: Segment): number[] {
  return u.map((t, i) => {
    const p = pts[first + i];
    const d = sub(q(bez, t), p);
    const d1 = qPrime(bez, t);
    const d2 = qPrimePrime(bez, t);
    const num = dot(d, d1);
    const den = dot(d1, d1) + dot(d, d2);
    if (den === 0) return t;
    return Math.max(0, Math.min(1, t - num / den));
  });
}

function chordLengthParameterize(pts: Vec[], first: number, last: number): number[] {
  const u = [0];
  for (let i = first + 1; i <= last; i++) u.push(u[u.length - 1] + dist(pts[i], pts[i - 1]));
  const total = u[u.length - 1] || 1;
  return u.map((x) => x / total);
}

function computeMaxError(pts: Vec[], first: number, last: number, bez: Segment, u: number[]) {
  let maxError = 0;
  let splitPoint = Math.floor((last - first + 1) / 2) + first;
  for (let i = first + 1; i < last; i++) {
    const d = dist(q(bez, u[i - first]), pts[i]);
    if (d > maxError) {
      maxError = d;
      splitPoint = i;
    }
  }
  return { maxError, splitPoint };
}

/** Converts a chain of fitted segments into a path with smooth nodes. */
export function segmentsToPath(segs: Segment[], closed: boolean): Path {
  if (segs.length === 0) return { nodes: [], closed };
  const nodes: PathNode[] = [{ x: segs[0][0].x, y: segs[0][0].y, out: segs[0][1] }];
  segs.forEach((s, i) => {
    const node: PathNode = { x: s[3].x, y: s[3].y, in: s[2] };
    if (i + 1 < segs.length) node.out = segs[i + 1][1];
    nodes.push(node);
  });
  if (closed && nodes.length > 2) {
    const last = nodes.pop()!;
    nodes[0].in = last.in;
    // Align the two handles at the seam so the closed shape has no kink.
    const n0 = nodes[0];
    if (n0.in && n0.out) {
      const dir = normalize(sub(n0.out, n0.in));
      const lIn = dist(n0, n0.in);
      const lOut = dist(n0, n0.out);
      n0.in = sub(n0, scale(dir, lIn));
      n0.out = add(n0, scale(dir, lOut));
    }
  }
  return { nodes, closed };
}

/**
 * The full freehand-to-curve pipeline used by the curve tool.
 * `tolerance` is how far (model units) the curve may stray from the stroke.
 */
export function fitStroke(raw: Vec[], tolerance: number, closed: boolean): Path {
  let pts = dedupe(raw, tolerance / 4);
  if (pts.length < 2) return { nodes: pts.map((p) => ({ x: p.x, y: p.y })), closed: false };
  if (!closed || pts.length < 4) {
    pts = smoothStroke(pts, 2, false);
    return segmentsToPath(fitCubics(pts, tolerance), false);
  }

  // A loop can't be fitted as one curve from a point back to itself, so fit
  // it as two halves that share a tangent at the seam and at the far point.
  pts = smoothStroke(pts, 2, true);
  const n = pts.length;
  let far = 1;
  for (let i = 1; i < n; i++) if (dist(pts[i], pts[0]) > dist(pts[far], pts[0])) far = i;
  far = Math.max(2, Math.min(n - 2, far));
  const seam = normalize(sub(pts[1], pts[n - 1]));
  const farTangent = normalize(sub(pts[far + 1], pts[far - 1]));
  const firstHalf = pts.slice(0, far + 1);
  const secondHalf = [...pts.slice(far), pts[0]];
  const segs = [
    ...fitCubic(firstHalf, 0, firstHalf.length - 1, seam, scale(farTangent, -1), tolerance, 0),
    ...fitCubic(secondHalf, 0, secondHalf.length - 1, farTangent, scale(seam, -1), tolerance, 0),
  ];
  return segmentsToPath(segs, true);
}
