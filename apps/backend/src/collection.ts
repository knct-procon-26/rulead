import { zValidator } from "./lib/validator";
import img2rules from "./lib/img2rules";
import { Hono } from "hono";
import z from "zod";
import { AuthContext } from "./auth";
import { db } from "./db/client";
import { collections, icons, rules, users } from "./db/schema";
import { eq } from "drizzle-orm";

const app = new Hono<AuthContext>();

const collection = app.get("/", async (c) => {
  const [user] = await db
    .select({ signCount: users.signCount })
    .from(users)
    .where(eq(users.id, c.var.userId));

  const userCollections = await db
    .select({
      id: collections.ruleId,
      count: collections.count,
      textEn: rules.textEn,
      iconName: icons.name,
      lastCollectedAt: collections.lastCollectedAt,
    })
    .from(collections)
    .where(eq(collections.userId, c.var.userId))
    .innerJoin(rules, eq(collections.ruleId, rules.id))
    .innerJoin(icons, eq(rules.iconId, icons.id));

  return c.json(
    {
      success: true,
      signCount: user.signCount,
      rules: userCollections,
    },
    200,
  );
});

export default collection;
