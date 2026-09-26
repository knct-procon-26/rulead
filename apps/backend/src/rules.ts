import { zValidator } from "./lib/validator";
import img2rules from "./lib/img2rules";
import { Hono } from "hono";
import z from "zod";
import { db } from "./db/client";
import { collections, parkRules, parks, rules, users } from "./db/schema";
import { AuthContext } from "./auth";
import { eq, sql } from "drizzle-orm";
import type { Polygon } from "geojson";

const app = new Hono<AuthContext>();

const extractRulesSchema = z.object({
  park: z.object({
    id: z.number().optional(),
    name: z.string(),
    address: z.string(),
    geometry: z.array(
      z.object({
        latitude: z.number(),
        longitude: z.number(),
      }),
    ),
  }),
  // rules: z.array(
  //   z.object({
  //     id: z.string(),
  //     text: z.string(),
  //     iconId: z.number().optional(),
  //   }),
  // ),
  ruleIds: z.array(z.uuid()),
});

const rulesApi = app.post(
  "/",
  zValidator("json", extractRulesSchema),
  async (c) => {
    const data = c.req.valid("json");
    const userId = c.var.userId;

    // const uniqueRules = [
    //   ...new Map(data.rules.map((r) => [r.id, r])).values(),
    // ].sort((a, b) => a.id.localeCompare(b.id));
    const ruleIds = [...new Set(data.ruleIds)].sort();

    const result = await db.transaction(async (tx) => {
      let parkId: number;
      if (data.park.id === undefined) {
        const [insertedPark] = await tx
          .insert(parks)
          .values({
            name: data.park.name,
            address: data.park.address,
            createdBy: c.var.userId,
            area: {
              type: "Polygon",
              coordinates: [
                data.park.geometry.map((point) => [
                  point.longitude,
                  point.latitude,
                ]),
              ],
            },
          })
          .returning({ id: parks.id });
        parkId = insertedPark.id;
      } else {
        parkId = data.park.id;
      }

      // if (uniqueRules.length === 0) {
      if (ruleIds.length === 0) {
        return { parkId, ruleIds: [] };
      }

      // await tx
      //   .insert(rules)
      //   .values(
      //     uniqueRules.map((r) => ({
      //       id: r.id,
      //       textEn: r.text,
      //       iconId: r.iconId ?? 1,
      //     })),
      //   )
      //   .onConflictDoNothing({ target: rules.id });

      await tx
        .insert(parkRules)
        .values(
          // uniqueRules.map((r) => ({
          ruleIds.map((ruleId) => ({
            parkId,
            // ruleId: r.id,
            ruleId,
            createdBy: userId,
          })),
        )
        .onConflictDoNothing({ target: [parkRules.parkId, parkRules.ruleId] });

      await tx
        .insert(collections)
        .values(
          // uniqueRules.map((r) => ({
          ruleIds.map((ruleId) => ({
            userId,
            // ruleId: r.id,
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

      // return { parkId, ruleIds: uniqueRules.map((r) => r.id) };
      return { parkId, ruleIds };
    });

    return c.json(result, 201);
  },
);

export default rulesApi;
