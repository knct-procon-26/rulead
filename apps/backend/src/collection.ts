import { Hono } from "hono";
import { AuthContext } from "./auth";
import { db } from "./db/client";
import { collections, icons, parks, rules, users } from "./db/schema";
import {
  and,
  countDistinct,
  eq,
  gt,
  inArray,
  isNull,
  sql,
  sum,
} from "drizzle-orm";
import { rarityOf, referenceTotal } from "./lib/rarity";

const app = new Hono<AuthContext>();

const collection = app.get("/", async (c) => {
  const userId = c.var.userId;

  const [user] = await db
    .select({ signCount: users.signCount })
    .from(users)
    .where(eq(users.id, userId));

  const userCollections = await db
    .select({
      id: collections.ruleId,
      count: collections.count,
      textEn: rules.textEn,
      iconName: icons.name,
      iconType: icons.iconType,
      lastCollectedAt: collections.lastCollectedAt,
    })
    .from(collections)
    .where(eq(collections.userId, userId))
    .innerJoin(rules, eq(collections.ruleId, rules.id))
    .innerJoin(icons, eq(rules.iconId, icons.id));

  const ruleIds = userCollections.map((i) => i.id);

  const totals =
    ruleIds.length === 0
      ? []
      : await db
          .select({
            ruleId: collections.ruleId,
            total: sum(collections.count).mapWith(Number),
          })
          .from(collections)
          .where(inArray(collections.ruleId, ruleIds))
          .groupBy(collections.ruleId);
  const totalMap = new Map(totals.map((t) => [t.ruleId, t.total]));

  const [{ total, kinds }] = await db
    .select({
      total: sum(collections.count).mapWith(Number),
      kinds: countDistinct(collections.ruleId),
    })
    .from(collections)
    .where(gt(collections.count, 0));
  const dist = await db.execute<{ sq: number | string; s: number | string }>(
    sql`SELECT coalesce(sum(t * t), 0)::float8 AS sq, coalesce(sum(t), 0)::float8 AS s
        FROM (SELECT sum(${collections.count})::float8 AS t FROM ${collections}
              WHERE ${collections.count} > 0 GROUP BY ${collections.ruleId}) AS per_rule`,
  );
  const typical = referenceTotal(
    Number(dist.rows[0]?.sq ?? 0),
    Number(dist.rows[0]?.s ?? 0),
  );

  return c.json(
    {
      success: true,
      signCount: user.signCount,
      rules: userCollections.map((i) => {
        const ruleTotal = totalMap.get(i.id) ?? 0;
        return {
          ...i,
          total: ruleTotal,
          rarity: rarityOf(ruleTotal, typical),
        };
      }),
      total,
      kinds,
    },
    200,
  );
});

export default collection;
