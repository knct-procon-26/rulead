import { zValidator } from "./lib/validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import z from "zod";
import { db } from "./db/client";
import { collections, parkRules, parks, users } from "./db/schema";
import { AuthContext } from "./auth";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Polygon } from "geojson";

const MAX_GEOMETRY_POINTS = 20_000;
const MAX_PARK_AREA_M2 = 5_000_000;
const SAME_PARK_IOU = 0.8;
const PARK_CREATE_LOCK_KEY = 73_110_001;

const app = new Hono<AuthContext>();

const pointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const extractRulesSchema = z.object({
  park: z.object({
    id: z.number().int().positive().optional(),
    name: z.string().max(200),
    address: z.string().max(500),
    geometry: z.array(pointSchema).min(3).max(MAX_GEOMETRY_POINTS),
  }),
  ruleIds: z.array(z.uuid()).min(1),
});

type ParkInput = z.infer<typeof extractRulesSchema>["park"];
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function toClosedRing(geometry: ParkInput["geometry"]): [number, number][] {
  const ring = geometry.map(
    (p) => [p.longitude, p.latitude] as [number, number],
  );
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }
  return ring;
}

async function requireExistingPark(tx: Tx, id: number): Promise<number> {
  const [park] = await tx
    .select({ id: parks.id })
    .from(parks)
    .where(and(eq(parks.id, id), isNull(parks.deletedAt)))
    .limit(1);
  if (!park) throw new HTTPException(404, { message: "公園が見つかりません" });
  return park.id;
}

async function findOrCreatePark(
  tx: Tx,
  park: ParkInput,
  userId: string,
): Promise<number> {
  const ring = toClosedRing(park.geometry);
  if (ring.length < 4) {
    throw new HTTPException(400, { message: "公園の範囲が正しくありません" });
  }
  const polygon: Polygon = { type: "Polygon", coordinates: [ring] };
  const geom = sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(polygon)}::text), 4326)`;

  const checked = await tx.execute(
    sql`SELECT ST_IsValid(g) AS valid, ST_Area(g::geography) AS area FROM (SELECT ${geom} AS g) AS s`,
  );
  const row = checked.rows[0];
  if (!row || row.valid !== true) {
    throw new HTTPException(400, { message: "公園の範囲が正しくありません" });
  }
  const area = Number(row.area);
  if (!Number.isFinite(area) || area <= 0) {
    throw new HTTPException(400, { message: "公園の範囲が正しくありません" });
  }
  if (area > MAX_PARK_AREA_M2) {
    throw new HTTPException(400, { message: "公園の範囲が広すぎます" });
  }

  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(${PARK_CREATE_LOCK_KEY}::bigint)`,
  );

  const overlaps = await tx
    .select({
      id: parks.id,
      iou: sql<number>`ST_Area(ST_Intersection(${parks.area}, ${geom})) / NULLIF(ST_Area(ST_Union(${parks.area}, ${geom})), 0)`,
    })
    .from(parks)
    .where(
      and(
        isNull(parks.deletedAt),
        sql`${parks.area} && ${geom}`,
        sql`ST_Intersects(${parks.area}, ${geom})`,
      ),
    )
    .limit(50);

  let best: { id: number; iou: number } | null = null;
  for (const o of overlaps) {
    const iou = Number(o.iou);
    if (Number.isFinite(iou) && (best === null || iou > best.iou)) {
      best = { id: o.id, iou };
    }
  }
  if (best && best.iou >= SAME_PARK_IOU) return best.id;

  const [inserted] = await tx
    .insert(parks)
    .values({
      name: park.name.trim(),
      address: park.address,
      createdBy: userId,
      area: polygon,
    })
    .returning({ id: parks.id });
  return inserted.id;
}

const rulesApi = app.post(
  "/",
  zValidator("json", extractRulesSchema),
  async (c) => {
    const data = c.req.valid("json");
    const userId = c.var.userId;

    const ruleIds = [...new Set(data.ruleIds)].sort();

    const result = await db.transaction(async (tx) => {
      const parkId =
        data.park.id !== undefined
          ? await requireExistingPark(tx, data.park.id)
          : await findOrCreatePark(tx, data.park, userId);

      await tx
        .insert(parkRules)
        .values(
          ruleIds.map((ruleId) => ({
            parkId,
            ruleId,
            createdBy: userId,
          })),
        )
        .onConflictDoNothing({ target: [parkRules.parkId, parkRules.ruleId] });

      await tx
        .insert(collections)
        .values(
          ruleIds.map((ruleId) => ({
            userId,
            ruleId,
            count: 1,
            lastCollectedAt: new Date(),
          })),
        )
        .onConflictDoUpdate({
          target: [collections.userId, collections.ruleId],
          set: {
            count: sql`${collections.count} + 1`,
            lastCollectedAt: new Date(),
          },
        });

      await tx
        .update(users)
        .set({ signCount: sql`${users.signCount} + 1` })
        .where(eq(users.id, userId));

      return { parkId, ruleIds };
    });

    return c.json(result, 201);
  },
);

export default rulesApi;
