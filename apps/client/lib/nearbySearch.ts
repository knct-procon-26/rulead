import { api } from "@/lib/client";
import * as ParkTracker from "@/modules/park-tracker";
import {
  containsPoint,
  distanceToRingM,
  type LatLngLike,
} from "@/components/scan/polygon";
import type { ScannedRule } from "@/components/rules/types";
import type { Messages } from "@/lib/i18n";

export type SearchPark = {
  id: string;
  name: string;
  address: string;
  rules: ScannedRule[];

  distanceM: number;

  center: LatLngLike;
};

const METERS_PER_DEG_LAT = 111_320;
const STEP_LAT = 1000 / METERS_PER_DEG_LAT;

export function cellCenter(p: LatLngLike): LatLngLike {
  const latIdx = Math.floor(p.latitude / STEP_LAT);
  const centerLat = (latIdx + 0.5) * STEP_LAT;
  const stepLng = STEP_LAT / Math.cos((centerLat * Math.PI) / 180);
  const lngIdx = Math.floor(p.longitude / stepLng);
  return { latitude: centerLat, longitude: (lngIdx + 0.5) * stepLng };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseParks(body: unknown, here: LatLngLike): SearchPark[] {
  if (!isRecord(body) || !Array.isArray(body.features)) return [];
  const out: SearchPark[] = [];
  const seen = new Set<string>();
  for (const f of body.features) {
    if (!isRecord(f)) continue;
    const idNum = typeof f.id === "number" ? f.id : Number(f.id);
    if (!Number.isSafeInteger(idNum) || idNum <= 0) continue;
    const id = String(idNum);
    if (seen.has(id)) continue;
    const props = isRecord(f.properties) ? f.properties : {};
    const polygons = ParkTracker.parseGeometry(
      JSON.stringify(f.geometry ?? null),
    );
    if (polygons.length === 0) continue;
    const rules = ParkTracker.parseRules(JSON.stringify(props.rules ?? []));

    let distanceM = Infinity;
    for (const poly of polygons) {
      const d = containsPoint(poly.outer, here)
        ? 0
        : distanceToRingM(poly.outer, here);
      if (d < distanceM) distanceM = d;
    }
    const outer = polygons[0].outer;
    const center = {
      latitude: outer.reduce((s, p) => s + p.latitude, 0) / outer.length,
      longitude: outer.reduce((s, p) => s + p.longitude, 0) / outer.length,
    };
    seen.add(id);
    out.push({
      id,
      name: typeof props.name === "string" ? props.name : "",
      address: typeof props.address === "string" ? props.address : "",
      rules,
      distanceM: Number.isFinite(distanceM) ? distanceM : 0,
      center,
    });
  }
  return out;
}

export async function fetchParksAround(
  here: LatLngLike,
): Promise<SearchPark[]> {
  const c = cellCenter(here);
  const res = await api.api.parks.nearby.$get({
    query: {
      lat: c.latitude.toFixed(6),
      lng: c.longitude.toFixed(6),
    },
  });
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    const message =
      isRecord(body) && typeof body.error === "string"
        ? body.error
        : `HTTP ${res.status}`;
    throw new Error(message);
  }
  const body: unknown = await res.json();
  return parseParks(body, here);
}

export function formatDistance(t: Messages, m: number): string {
  if (m <= 0) return t.ruleSearch.distanceHere;
  if (m < 1000)
    return t.ruleSearch.distanceAbout(`${Math.max(10, Math.round(m / 10) * 10)}m`);
  return t.ruleSearch.distanceAbout(`${(m / 1000).toFixed(1)}km`);
}

export function mapsUrl(p: LatLngLike): string {
  return `https://www.google.com/maps/search/?api=1&query=${p.latitude.toFixed(6)},${p.longitude.toFixed(6)}`;
}
