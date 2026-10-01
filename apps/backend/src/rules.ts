import { zValidator } from "./lib/validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import z from "zod";
import { db } from "./db/client";
import { collections, parkRules, parks, ruleVotes, users } from "./db/schema";
import { AuthContext } from "./auth";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Polygon } from "geojson";
import {
  castVotes,
  FULL_WEIGHT,
  reevaluateParkRule,
  reevaluateParkRules,
  tallyVotes,
} from "./lib/ruleVotes";
import { pickBonus, type Bonus } from "./lib/bonus";

const MAX_GEOMETRY_POINTS = 20_000;
const MAX_PARK_AREA_M2 = 5_000_000;
const SAME_PARK_IOU = 0.8;
const SAME_PARK_COVER = 0.5;
const SAME_PARK_MIN_AREA_RATIO = 0.25;
const SAME_NAME_DISTANCE_M = 50;
const SAME_NAME_BBOX_DEG = 0.001;
const PARK_CREATE_LOCK_KEY = 73_110_001;
const SUGGEST_ACCEPT_WEIGHT = FULL_WEIGHT;

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

const voteSchema = z.object({
  parkId: z.number().int().positive(),
  ruleId: z.uuid(),
  exists: z.boolean(),
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

function normalizeParkName(name: string): string {
  return name.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
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
    sql`SELECT ST_IsValid(g) AS valid, ST_Area(g::geography) AS area, ST_Area(g) AS planar_area FROM (SELECT ${geom} AS g) AS s`,
  );
  const row = checked.rows[0];
  if (!row || row.valid !== true) {
    throw new HTTPException(400, { message: "公園の範囲が正しくありません" });
  }
  const area = Number(row.area);
  const planarArea = Number(row.planar_area);
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
      inter: sql<number>`ST_Area(ST_Intersection(${parks.area}, ${geom}))`,
      existingArea: sql<number>`ST_Area(${parks.area})`,
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
  let bestCover: { id: number; cover: number } | null = null;
  for (const o of overlaps) {
    const iou = Number(o.iou);
    if (Number.isFinite(iou) && (best === null || iou > best.iou)) {
      best = { id: o.id, iou };
    }
    const inter = Number(o.inter);
    const existingArea = Number(o.existingArea);
    const smaller = Math.min(existingArea, planarArea);
    const larger = Math.max(existingArea, planarArea);
    if (
      !Number.isFinite(inter) ||
      !Number.isFinite(smaller) ||
      !Number.isFinite(larger) ||
      smaller <= 0
    ) {
      continue;
    }
    const cover = inter / smaller;
    if (
      cover >= SAME_PARK_COVER &&
      smaller / larger >= SAME_PARK_MIN_AREA_RATIO &&
      (bestCover === null || cover > bestCover.cover)
    ) {
      bestCover = { id: o.id, cover };
    }
  }
  if (best && best.iou >= SAME_PARK_IOU) return best.id;
  if (bestCover) return bestCover.id;

  const normalizedName = normalizeParkName(park.name);
  if (normalizedName !== "") {
    const nearby = await tx
      .select({
        id: parks.id,
        name: parks.name,
        dist: sql<number>`ST_Distance(${parks.area}::geography, ${geom}::geography)`,
      })
      .from(parks)
      .where(
        and(
          isNull(parks.deletedAt),
          sql`${parks.area} && ST_Expand(${geom}, ${SAME_NAME_BBOX_DEG}::float8)`,
          sql`ST_DWithin(${parks.area}::geography, ${geom}::geography, ${SAME_NAME_DISTANCE_M}::float8)`,
        ),
      )
      .limit(50);
    let sameName: { id: number; dist: number } | null = null;
    for (const p of nearby) {
      if (normalizeParkName(p.name) !== normalizedName) continue;
      const dist = Number(p.dist);
      if (!Number.isFinite(dist)) continue;
      if (sameName === null || dist < sameName.dist) {
        sameName = { id: p.id, dist };
      }
    }
    if (sameName) return sameName.id;
  }

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

const rulesApi = app
  .post("/", zValidator("json", extractRulesSchema), async (c) => {
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

      await castVotes(tx, userId, parkId, ruleIds, true, "scan");
      await reevaluateParkRules(tx, parkId, ruleIds);

      return { parkId, ruleIds };
    });

    let bonus: Bonus | null = null;
    try {
      bonus = await pickBonus(userId, result.parkId);
    } catch (e) {
      console.error("pickBonus failed", e);
    }

    return c.json({ ...result, bonus }, 201);
  })
  .post("/vote", zValidator("json", voteSchema), async (c) => {
    const { parkId, ruleId, exists } = c.req.valid("json");
    const userId = c.var.userId;

    const result = await db.transaction(async (tx) => {
      const [answered] = await tx
        .update(ruleVotes)
        .set({ vote: exists, updatedAt: new Date() })
        .where(
          and(
            eq(ruleVotes.parkId, parkId),
            eq(ruleVotes.ruleId, ruleId),
            eq(ruleVotes.userId, userId),
            isNull(ruleVotes.vote),
            inArray(ruleVotes.source, ["verify", "suggest"]),
          ),
        )
        .returning({ source: ruleVotes.source });
      if (!answered) {
        throw new HTTPException(409, {
          message: "この回答は受け付けられませんでした",
        });
      }

      if (exists) {
        await tx
          .insert(collections)
          .values({ userId, ruleId, count: 1, lastCollectedAt: new Date() })
          .onConflictDoUpdate({
            target: [collections.userId, collections.ruleId],
            set: {
              count: sql`${collections.count} + 1`,
              lastCollectedAt: new Date(),
            },
          });

        if (answered.source === "suggest") {
          const t = await tallyVotes(tx, parkId, ruleId, null, "suggest");
          if (t.yes >= SUGGEST_ACCEPT_WEIGHT && t.yes > t.no) {
            const [park] = await tx
              .select({ id: parks.id })
              .from(parks)
              .where(and(eq(parks.id, parkId), isNull(parks.deletedAt)))
              .limit(1);
            if (park) {
              await tx
                .insert(parkRules)
                .values({ parkId, ruleId, createdBy: userId })
                .onConflictDoNothing({
                  target: [parkRules.parkId, parkRules.ruleId],
                });
            }
          }
        }
      }

      await reevaluateParkRule(tx, parkId, ruleId);
      return { collected: exists };
    });

    return c.json({ success: true, collected: result.collected }, 200);
  });

export default rulesApi;
