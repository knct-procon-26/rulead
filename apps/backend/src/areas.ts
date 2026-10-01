import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { sql } from "drizzle-orm";
import z from "zod";
import { db } from "./db/client";
import { AuthContext } from "./auth";
import { zValidator } from "./lib/validator";

const MAX_AREAS = 20;
const NEARBY_MAX_DISTANCE_M = 60;
const NEARBY_BBOX_DEG = 0.0015;
const MAX_NEARBY_AREAS = 5;

const querySchema = z.object({
  lat: z.string(),
  lng: z.string(),
});

type AreaRow = {
  osmId: string;
  name: string;
  nameEn: string | null;
  kind: string;
  ring: string;
};

type NearbyAreaRow = AreaRow & { dist: number | string };

function toGeometry(ring: string) {
  const line = JSON.parse(ring) as { coordinates: [number, number][] };
  return line.coordinates.map(([longitude, latitude]) => ({
    latitude,
    longitude,
  }));
}

const app = new Hono<AuthContext>();

const areasRoute = app.get("/", zValidator("query", querySchema), async (c) => {
  const q = c.req.valid("query");
  const lat = Number.parseFloat(q.lat);
  const lng = Number.parseFloat(q.lng);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    throw new HTTPException(400, { message: "invalid lat/lng" });
  }

  const point = sql`ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)`;

  const result = await db.execute<AreaRow>(sql`
    SELECT a.osm_id AS "osmId", a.name, a.name_en AS "nameEn", a.kind,
           ST_AsGeoJSON(ST_ExteriorRing(p.geom), 7) AS ring
    FROM osm_areas a
    CROSS JOIN LATERAL ST_Dump(a.area) AS p
    WHERE ST_Intersects(a.area, ${point})
      AND ST_Intersects(p.geom, ${point})
    ORDER BY (a.kind = 'leisure=park') DESC, ST_Area(p.geom) ASC, a.id ASC
    LIMIT ${MAX_AREAS}
  `);

  const areas = result.rows.map((r) => ({
    osmId: r.osmId,
    name: r.name,
    nameEn: r.nameEn,
    kind: r.kind,
    geometry: toGeometry(r.ring),
  }));

  let nearby: {
    osmId: string;
    name: string;
    nameEn: string | null;
    kind: string;
    distanceM: number;
    geometry: { latitude: number; longitude: number }[];
  }[] = [];
  try {
    const near = await db.execute<NearbyAreaRow>(sql`
      SELECT a.osm_id AS "osmId", a.name, a.name_en AS "nameEn", a.kind,
             ST_AsGeoJSON(ST_ExteriorRing(p.geom), 7) AS ring,
             ST_Distance(p.geom::geography, ${point}::geography) AS dist
      FROM osm_areas a
      CROSS JOIN LATERAL ST_Dump(a.area) AS p
      WHERE a.area && ST_Expand(${point}, ${NEARBY_BBOX_DEG}::float8)
        AND NOT ST_Intersects(a.area, ${point})
        AND ST_DWithin(p.geom::geography, ${point}::geography, ${NEARBY_MAX_DISTANCE_M}::float8)
      ORDER BY dist ASC, a.id ASC
      LIMIT ${MAX_NEARBY_AREAS}
    `);
    nearby = near.rows.flatMap((r) => {
      const distanceM = Number(r.dist);
      if (!Number.isFinite(distanceM)) return [];
      return [
        {
          osmId: r.osmId,
          name: r.name,
          nameEn: r.nameEn,
          kind: r.kind,
          distanceM,
          geometry: toGeometry(r.ring),
        },
      ];
    });
  } catch (e) {
    console.error("nearby areas lookup failed", e);
  }

  return c.json({ areas, nearby }, 200);
});

export default areasRoute;
