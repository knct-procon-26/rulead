import type {
  GeoPoint,
  ParkPolygon,
  Sighting,
  TrackPoint,
  Visit,
} from "@/modules/park-tracker";
import type { Messages } from "@/lib/i18n";

export type DiaryPage = {
  key: string;
  day: string; // "YYYY-MM-DD"
  parkId: string;
  name: string;
  enteredAt: number;
};

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MINUTE = 60 * 1000;

const pad2 = (n: number) => String(n).padStart(2, "0");

export function dayKeyOf(time: number): string {
  const d = new Date(time);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseDay(
  day: string,
): { y: number; m: number; d: number } | null {
  const m = DAY_RE.exec(day);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== d
  )
    return null;
  return { y, m: mo, d };
}

export function dayRange(day: string): { start: number; end: number } | null {
  const p = parseDay(day);
  if (!p) return null;
  return {
    start: new Date(p.y, p.m - 1, p.d).getTime(),
    end: new Date(p.y, p.m - 1, p.d + 1).getTime(),
  };
}

export function formatDayLabel(t: Messages, day: string): string {
  const p = parseDay(day);
  if (!p) return day;
  const weekday = new Date(p.y, p.m - 1, p.d).getDay();
  return t.diary.dayLabel(p.y, p.m, p.d, weekday);
}

export function formatTime(time: number): string {
  const d = new Date(time);
  return `${d.getHours()}:${pad2(d.getMinutes())}`;
}

export function formatDuration(t: Messages, ms: number): string {
  if (!Number.isFinite(ms) || ms < MINUTE) return t.diary.durationUnderMinute;
  const total = Math.round(ms / MINUTE);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return t.diary.duration(h, m);
}

export function buildPages(visits: Visit[]): DiaryPage[] {
  const byKey = new Map<string, DiaryPage>();
  for (const v of visits) {
    if (!v || typeof v.parkId !== "string" || v.parkId === "") continue;
    if (typeof v.enteredAt !== "number" || !Number.isFinite(v.enteredAt))
      continue;
    const day = parseDay(v.day) ? v.day : dayKeyOf(v.enteredAt);
    const key = `${day}|${v.parkId}`;
    const prev = byKey.get(key);
    if (!prev || v.enteredAt < prev.enteredAt) {
      byKey.set(key, {
        key,
        day,
        parkId: v.parkId,
        name: typeof v.name === "string" ? v.name : "",
        enteredAt: v.enteredAt,
      });
    }
  }
  return [...byKey.values()].sort(
    (a, b) =>
      a.day.localeCompare(b.day) ||
      a.enteredAt - b.enteredAt ||
      a.key.localeCompare(b.key),
  );
}

export type Stay = { start: number; end: number; points: GeoPoint[] };

export const STAY_GAP_MS = 10 * MINUTE;

const validCoord = (lat: number, lng: number) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180;

export function buildStays(track: TrackPoint[], parkId: string): Stay[] {
  const pts = track
    .filter(
      (p) =>
        Array.isArray(p.parkIds) &&
        p.parkIds.includes(parkId) &&
        Number.isFinite(p.time) &&
        validCoord(p.lat, p.lng),
    )
    .sort((a, b) => a.time - b.time);
  const stays: Stay[] = [];
  let cur: Stay | null = null;
  for (const p of pts) {
    const point = { latitude: p.lat, longitude: p.lng };
    if (cur && p.time - cur.end <= STAY_GAP_MS) {
      cur.end = p.time;
      cur.points.push(point);
    } else {
      cur = { start: p.time, end: p.time, points: [point] };
      stays.push(cur);
    }
  }
  return stays;
}

export function stayPeriod(
  stays: Stay[],
  enteredAt: number,
): { start: number; end: number | null; total: number } {
  if (stays.length === 0) return { start: enteredAt, end: null, total: 0 };
  const start = Math.min(enteredAt, stays[0].start);
  const end = stays[stays.length - 1].end;
  const total = stays.reduce((s, x) => s + (x.end - x.start), 0);
  return { start, end, total };
}

export function photoWindows(
  stays: Stay[],
  margin: number = MINUTE,
): { start: number; end: number }[] {
  const ws = stays
    .map((s) => ({ start: s.start - margin, end: s.end + margin }))
    .sort((a, b) => a.start - b.start);
  const out: { start: number; end: number }[] = [];
  for (const w of ws) {
    const last = out[out.length - 1];
    if (last && w.start <= last.end) last.end = Math.max(last.end, w.end);
    else out.push({ ...w });
  }
  return out;
}

export function thinPoints<T>(points: T[], max: number): T[] {
  if (max < 2 || points.length <= max) return points;
  const out: T[] = [];
  const step = (points.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) out.push(points[Math.round(i * step)]);
  return out;
}

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const MIN_DELTA = 0.0015;

export function regionFor(
  polygons: ParkPolygon[],
  stays: Stay[],
): Region | null {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  const add = (p: GeoPoint) => {
    if (!validCoord(p.latitude, p.longitude)) return;
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLng) minLng = p.longitude;
    if (p.longitude > maxLng) maxLng = p.longitude;
  };
  for (const poly of polygons) poly.outer.forEach(add);
  for (const s of stays) s.points.forEach(add);
  if (minLat > maxLat || minLng > maxLng) return null;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.3, MIN_DELTA),
    longitudeDelta: Math.max((maxLng - minLng) * 1.3, MIN_DELTA),
  };
}

export type RankedSighting = {
  key: string;
  labelIndex: number;
  label: string;
  count: number;
  firstSeen: number;
  maxConfidence: number;
};

export function rankSightings(
  sightings: Sighting[],
  parkId: string,
  day: string,
  limit: number,
): RankedSighting[] {
  const byLabel = new Map<string, RankedSighting>();
  for (const s of sightings) {
    if (s.parkId !== parkId || s.day !== day) continue;
    if (!Number.isFinite(s.count) || s.count <= 0) continue;
    const key =
      Number.isInteger(s.labelIndex) && s.labelIndex >= 0
        ? `i:${s.labelIndex}`
        : `l:${s.label.toLowerCase()}`;
    const prev = byLabel.get(key);
    if (prev) {
      prev.count += s.count;
      prev.firstSeen = Math.min(prev.firstSeen, s.firstSeen);
      prev.maxConfidence = Math.max(prev.maxConfidence, s.maxConfidence);
    } else {
      byLabel.set(key, {
        key,
        labelIndex: s.labelIndex,
        label: s.label,
        count: s.count,
        firstSeen: s.firstSeen,
        maxConfidence: s.maxConfidence,
      });
    }
  }
  return [...byLabel.values()]
    .sort(
      (a, b) =>
        b.count - a.count ||
        b.maxConfidence - a.maxConfidence ||
        a.firstSeen - b.firstSeen,
    )
    .slice(0, Math.max(0, limit));
}

export function monthMatrix(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export type YearMonth = { y: number; m: number };

export const monthIndex = (ym: YearMonth) => ym.y * 12 + (ym.m - 1);

export function addMonths(ym: YearMonth, n: number): YearMonth {
  const i = monthIndex(ym) + n;
  return { y: Math.floor(i / 12), m: (((i % 12) + 12) % 12) + 1 };
}

export const dayKey = (y: number, m: number, d: number) =>
  `${y}-${pad2(m)}-${pad2(d)}`;
