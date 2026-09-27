import { Hono } from "hono";
import { and, asc, inArray, isNull, sql } from "drizzle-orm";
import { db } from "./db/client";
import { parkRules, parks } from "./db/schema";
import { AuthContext } from "./auth";
import { loadRules, type RuleResult } from "./lib/createRule";

const RADIUS_M = 1000;

const BBOX_DEG = 0.02;

const app = new Hono<AuthContext>();

const parksRoute = app.get("/nearby", async (c) => {
  const lat = Number.parseFloat(c.req.query("lat") ?? "");
  const lng = Number.parseFloat(c.req.query("lng") ?? "");
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return c.json({ error: "invalid lat/lng" }, 400);
  }

  const center = sql`ST_SetSRID(ST_MakePoint(${lng}::float8, ${lat}::float8), 4326)`;

  const rows = await db
    .select({
      id: parks.id,
      name: parks.name,
      address: parks.address,
      geometry: sql<string>`ST_AsGeoJSON(${parks.area}, 6)`,
    })
    .from(parks)
    .where(
      and(
        isNull(parks.deletedAt),
        sql`${parks.area} && ST_Expand(${center}, ${BBOX_DEG}::float8)`,
        sql`ST_DWithin(${parks.area}::geography, ${center}::geography, ${RADIUS_M}::float8)`,
      ),
    );

  const parkIds = rows.map((r) => r.id);
  const links =
    parkIds.length === 0
      ? []
      : await db
          .select({ parkId: parkRules.parkId, ruleId: parkRules.ruleId })
          .from(parkRules)
          .where(
            and(inArray(parkRules.parkId, parkIds), isNull(parkRules.hiddenAt)),
          )
          .orderBy(asc(parkRules.createdAt), asc(parkRules.id));

  const loaded = await loadRules([...new Set(links.map((l) => l.ruleId))]);
  const rulesOf = new Map<number, RuleResult[]>();
  for (const l of links) {
    const rule = loaded.get(l.ruleId);
    if (!rule) continue;
    const list = rulesOf.get(l.parkId);
    if (list) list.push(rule);
    else rulesOf.set(l.parkId, [rule]);
  }

  return c.json({
    type: "FeatureCollection",
    features: rows.map((r) => ({
      type: "Feature",
      id: r.id,
      properties: {
        name: r.name,
        address: r.address,
        rules: rulesOf.get(r.id) ?? [],
      },
      geometry: JSON.parse(r.geometry),
    })),
  });
});

export default parksRoute;
