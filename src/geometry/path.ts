import {
  type Bounds,
  type Vec,
  add,
  boundsOf,
  dist,
  distToSegment,
  lerp,
  normalize,
  scale,
  sub,
} from "./vec";

/**
 * A path node. Handles are absolute positions of the cubic Bézier control
 * points on either side of the node; a missing handle means the adjacent
 * segment is straight on that side.
 */
export interface PathNode {
  x: number;
  y: number;
  in?: Vec;
  out?: Vec;
}

export interface Path {
  nodes: PathNode[];
  closed: boolean;
}

export type Segment = [Vec, Vec, Vec, Vec];

export function segments(path: Path): Segment[] {
  const { nodes, closed } = path;
  const out: Segment[] = [];
  const count = closed ? nodes.length : nodes.length - 1;
  for (let i = 0; i < count; i++) {
    const a = nodes[i];
    const b = nodes[(i + 1) % nodes.length];
    out.push([{ x: a.x, y: a.y }, a.out ?? { x: a.x, y: a.y }, b.in ?? { x: b.x, y: b.y }, { x: b.x, y: b.y }]);
  }
  return out;
}

export const isStraight = (s: Segment) =>
  s[1].x === s[0].x && s[1].y === s[0].y && s[2].x === s[3].x && s[2].y === s[3].y;

export function pointOnCubic(s: Segment, t: number): Vec {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return {
    x: a * s[0].x + b * s[1].x + c * s[2].x + d * s[3].x,
    y: a * s[0].y + b * s[1].y + c * s[2].y + d * s[3].y,
  };
}

/**
 * Converts a path to a polyline. `tolerance` is the approximate maximum chord
 * length used on curved segments, in model units.
 */
export function flatten(path: Path, tolerance = 2): Vec[] {
  if (path.nodes.length === 0) return [];
  const pts: Vec[] = [{ x: path.nodes[0].x, y: path.nodes[0].y }];
  for (const s of segments(path)) {
    if (isStraight(s)) {
      pts.push(s[3]);
      continue;
    }
    const approxLen = dist(s[0], s[1]) + dist(s[1], s[2]) + dist(s[2], s[3]);
    const steps = Math.max(4, Math.min(256, Math.ceil(approxLen / tolerance)));
    for (let i = 1; i <= steps; i++) pts.push(pointOnCubic(s, i / steps));
  }
  if (path.closed && pts.length > 1) pts.pop();
  return pts;
}

/** Signed shoelace area (positive when the points run clockwise on screen). */
export function signedArea(points: Vec[]): number {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export function pathArea(path: Path): number {
  if (!path.closed || path.nodes.length < 2) return 0;
  const pts = flatten(path, 0.5);
  return pts.length < 3 ? 0 : Math.abs(signedArea(pts));
}

export function pathLength(path: Path): number {
  const pts = flatten(path, 0.5);
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1], pts[i]);
  if (path.closed && pts.length > 1) total += dist(pts[pts.length - 1], pts[0]);
  return total;
}

/** Bounds including handles; slightly loose for curves, which is fine for culling. */
export function pathBounds(path: Path): Bounds {
  const pts: Vec[] = [];
  for (const n of path.nodes) {
    pts.push(n);
    if (n.in) pts.push(n.in);
    if (n.out) pts.push(n.out);
  }
  return boundsOf(pts);
}

export function pointInPolygon(p: Vec, poly: Vec[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function distanceToPath(p: Vec, path: Path): number {
  const pts = flatten(path, 1);
  let best = Infinity;
  const count = path.closed ? pts.length : pts.length - 1;
  for (let i = 0; i < count; i++) best = Math.min(best, distToSegment(p, pts[i], pts[(i + 1) % pts.length]));
  if (pts.length === 1) best = dist(p, pts[0]);
  return best;
}

export function translatePath(path: Path, d: Vec): Path {
  const mv = (v: Vec | undefined) => (v ? add(v, d) : undefined);
  return {
    closed: path.closed,
    nodes: path.nodes.map((n) => clean({ x: n.x + d.x, y: n.y + d.y, in: mv(n.in), out: mv(n.out) })),
  };
}

/** Applies an arbitrary point transform to every node and handle. */
export function mapPath(path: Path, f: (v: Vec) => Vec): Path {
  return {
    closed: path.closed,
    nodes: path.nodes.map((n) => {
      const p = f(n);
      return clean({ x: p.x, y: p.y, in: n.in && f(n.in), out: n.out && f(n.out) });
    }),
  };
}

function clean(n: PathNode): PathNode {
  const out: PathNode = { x: n.x, y: n.y };
  if (n.in) out.in = n.in;
  if (n.out) out.out = n.out;
  return out;
}

export function rectPath(x: number, y: number, w: number, h: number): Path {
  const x0 = Math.min(x, x + w), x1 = Math.max(x, x + w);
  const y0 = Math.min(y, y + h), y1 = Math.max(y, y + h);
  return {
    closed: true,
    nodes: [
      { x: x0, y: y0 },
      { x: x1, y: y0 },
      { x: x1, y: y1 },
      { x: x0, y: y1 },
    ],
  };
}

const KAPPA = 0.5522847498;

export function ellipsePath(cx: number, cy: number, rx: number, ry: number): Path {
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const kx = rx * KAPPA, ky = ry * KAPPA;
  return {
    closed: true,
    nodes: [
      { x: cx, y: cy - ry, in: { x: cx - kx, y: cy - ry }, out: { x: cx + kx, y: cy - ry } },
      { x: cx + rx, y: cy, in: { x: cx + rx, y: cy - ky }, out: { x: cx + rx, y: cy + ky } },
      { x: cx, y: cy + ry, in: { x: cx + kx, y: cy + ry }, out: { x: cx - kx, y: cy + ry } },
      { x: cx - rx, y: cy, in: { x: cx - rx, y: cy + ky }, out: { x: cx - rx, y: cy - ky } },
    ],
  };
}

/**
 * Gives a node smooth handles based on its neighbours (Catmull-Rom style),
 * which is what "convert to smooth" does in the node editor.
 */
export function smoothNode(path: Path, index: number): PathNode {
  const n = path.nodes.length;
  const node = path.nodes[index];
  const prev = path.nodes[(index - 1 + n) % n];
  const next = path.nodes[(index + 1) % n];
  const hasPrev = path.closed || index > 0;
  const hasNext = path.closed || index < n - 1;
  const a = hasPrev ? prev : node;
  const b = hasNext ? next : node;
  const dir = normalize(sub(b, a));
  const inLen = hasPrev ? dist(node, prev) / 3 : 0;
  const outLen = hasNext ? dist(node, next) / 3 : 0;
  return {
    x: node.x,
    y: node.y,
    ...(hasPrev ? { in: sub(node, scale(dir, inLen)) } : {}),
    ...(hasNext ? { out: add(node, scale(dir, outLen)) } : {}),
  };
}

export function cornerNode(node: PathNode): PathNode {
  return { x: node.x, y: node.y };
}

/** Splits segment `index` at parameter t and returns the new path. */
export function insertNode(path: Path, segIndex: number, t: number): Path {
  const seg = segments(path)[segIndex];
  const nodes = path.nodes.map((n) => ({ ...n }));
  const a = nodes[segIndex];
  const bIndex = (segIndex + 1) % nodes.length;
  const b = nodes[bIndex];
  let mid: PathNode;
  if (isStraight(seg)) {
    const p = lerp(seg[0], seg[3], t);
    mid = { x: p.x, y: p.y };
  } else {
    // de Casteljau
    const p01 = lerp(seg[0], seg[1], t), p12 = lerp(seg[1], seg[2], t), p23 = lerp(seg[2], seg[3], t);
    const p012 = lerp(p01, p12, t), p123 = lerp(p12, p23, t);
    const p = lerp(p012, p123, t);
    a.out = p01;
    b.in = p23;
    mid = { x: p.x, y: p.y, in: p012, out: p123 };
  }
  nodes.splice(segIndex + 1, 0, mid);
  return { closed: path.closed, nodes };
}

/** Finds the closest segment and parameter to p (for inserting a node). */
export function closestOnPath(path: Path, p: Vec): { segIndex: number; t: number; distance: number } {
  let best = { segIndex: 0, t: 0, distance: Infinity };
  segments(path).forEach((s, i) => {
    const steps = isStraight(s) ? 1 : 64;
    let prev = s[0];
    for (let k = 1; k <= steps; k++) {
      const cur = isStraight(s) ? s[3] : pointOnCubic(s, k / steps);
      const d = distToSegment(p, prev, cur);
      if (d < best.distance) {
        // refine t inside this chord
        const ab = sub(cur, prev);
        const l2 = ab.x * ab.x + ab.y * ab.y;
        const local = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - prev.x) * ab.x + (p.y - prev.y) * ab.y) / l2));
        best = { segIndex: i, t: (k - 1 + local) / steps, distance: d };
      }
      prev = cur;
    }
  });
  return best;
}
