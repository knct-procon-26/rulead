export type LatLngLike = { latitude: number; longitude: number };

type XY = { x: number; y: number };

const M_PER_DEG_LAT = 110_574;
const M_PER_DEG_LNG_AT_EQUATOR = 111_320;
const EPS = 1e-9;
const MIN_EDGE_M = 0.01;

function projector(origin: LatLngLike): (p: LatLngLike) => XY {
  const kx =
    M_PER_DEG_LNG_AT_EQUATOR * Math.cos((origin.latitude * Math.PI) / 180);
  return (p) => ({
    x: (p.longitude - origin.longitude) * kx,
    y: (p.latitude - origin.latitude) * M_PER_DEG_LAT,
  });
}

function samePoint(a: LatLngLike, b: LatLngLike): boolean {
  return a.latitude === b.latitude && a.longitude === b.longitude;
}

function openRing<T extends LatLngLike>(ring: readonly T[]): T[] {
  if (ring.length >= 2 && samePoint(ring[0], ring[ring.length - 1])) {
    return ring.slice(0, -1);
  }
  return [...ring];
}

export function closeRing(ring: readonly LatLngLike[]): LatLngLike[] {
  const pts = ring.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
  }));
  if (pts.length > 0 && !samePoint(pts[0], pts[pts.length - 1])) {
    pts.push({ ...pts[0] });
  }
  return pts;
}

export function areaM2(ring: readonly LatLngLike[]): number {
  const pts = openRing(ring);
  const n = pts.length;
  if (n < 3) return 0;
  const xy = pts.map(projector(pts[0]));
  let s = 0;
  for (let i = 0; i < n; i++) {
    const a = xy[i];
    const b = xy[(i + 1) % n];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

export function containsPoint(
  ring: readonly LatLngLike[],
  p: LatLngLike,
): boolean {
  const pts = openRing(ring);
  const n = pts.length;
  if (n < 3) return false;
  const xy = pts.map(projector(p));
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = xy[i];
    const b = xy[j];
    if (a.y > 0 !== b.y > 0) {
      const x = a.x + ((0 - a.y) * (b.x - a.x)) / (b.y - a.y);
      if (x > 0) inside = !inside;
    }
  }
  return inside;
}

export function distanceToRingM(
  ring: readonly LatLngLike[],
  p: LatLngLike,
): number {
  const pts = openRing(ring);
  const n = pts.length;
  if (n === 0) return Infinity;
  if (containsPoint(pts, p)) return 0;
  const xy = pts.map(projector(p));
  if (n === 1) return Math.hypot(xy[0].x, xy[0].y);
  let best = Infinity;
  for (let i = 0; i < n; i++) {
    const a = xy[i];
    const b = xy[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : -(a.x * dx + a.y * dy) / len2;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    best = Math.min(best, Math.hypot(a.x + t * dx, a.y + t * dy));
  }
  return best;
}

function orient(a: XY, b: XY, c: XY): number {
  const v = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return Math.abs(v) < EPS ? 0 : v > 0 ? 1 : -1;
}

function onSegment(a: XY, b: XY, c: XY): boolean {
  return (
    Math.min(a.x, b.x) - EPS <= c.x &&
    c.x <= Math.max(a.x, b.x) + EPS &&
    Math.min(a.y, b.y) - EPS <= c.y &&
    c.y <= Math.max(a.y, b.y) + EPS
  );
}

function segmentsIntersect(p1: XY, p2: XY, q1: XY, q2: XY): boolean {
  const o1 = orient(p1, p2, q1);
  const o2 = orient(p1, p2, q2);
  const o3 = orient(q1, q2, p1);
  const o4 = orient(q1, q2, p2);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, p2, q2)) return true;
  if (o3 === 0 && onSegment(q1, q2, p1)) return true;
  if (o4 === 0 && onSegment(q1, q2, p2)) return true;
  return false;
}

export function isSimpleRing(ring: readonly LatLngLike[]): boolean {
  const pts = openRing(ring);
  const n = pts.length;
  if (n < 3) return false;
  const xy = pts.map(projector(pts[0]));

  for (let i = 0; i < n; i++) {
    const a = xy[i];
    const b = xy[(i + 1) % n];
    if (Math.hypot(b.x - a.x, b.y - a.y) < MIN_EDGE_M) return false;
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a1 = xy[i];
      const a2 = xy[(i + 1) % n];
      const b1 = xy[j];
      const b2 = xy[(j + 1) % n];
      const adjacent = j === i + 1 || (i === 0 && j === n - 1);
      if (adjacent) {
        const [prev, shared, next] = j === i + 1 ? [a1, a2, b2] : [b1, a1, a2];
        const ux = shared.x - prev.x;
        const uy = shared.y - prev.y;
        const vx = next.x - shared.x;
        const vy = next.y - shared.y;
        if (orient(prev, shared, next) === 0 && ux * vx + uy * vy < 0) {
          return false;
        }
        continue;
      }
      if (segmentsIntersect(a1, a2, b1, b2)) return false;
    }
  }
  return true;
}
