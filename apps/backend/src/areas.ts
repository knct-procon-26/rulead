import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { sql } from "drizzle-orm";
import z from "zod";
import { db } from "./db/client";
import { AuthContext } from "./auth";
import { zValidator } from "./lib/validator";

const MAX_AREAS = 20;

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

  const areas = result.rows.map((r) => {
    const line = JSON.parse(r.ring) as { coordinates: [number, number][] };
    return {
      osmId: r.osmId,
      name: r.name,
      nameEn: r.nameEn,
      kind: r.kind,
      geometry: line.coordinates.map(([longitude, latitude]) => ({
        latitude,
        longitude,
      })),
    };
  });

  return c.json({ areas }, 200);
});

export default areasRoute;
