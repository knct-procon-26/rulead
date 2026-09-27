import { Hono } from "hono";
import scan from "./scan";
import { qdrantClient } from "./lib/qdrantClient";
import { COLLECTIONS, ensureCollections } from "./lib/qdrantSetup";
import { AuthContext, requireAuth } from "./auth";
import register from "./register";
import { HTTPException } from "hono/http-exception";
import { DrizzleQueryError } from "drizzle-orm";
import rulesApi from "./rules";
import collection from "./collection";
import translateRule from "./translateRules";
import report from "./report";
import parksRoute from "./parksNearby";
import areasRoute from "./areas";
import {
  DAILY_API_LIMIT,
  DEBUG_API_ENABLED,
  getApiUsage,
  rateLimit,
  resetApiUsage,
} from "./lib/rateLimit";
import { db } from "./db/client";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import { deleteAccount } from "./lib/account";

const authRoutes = new Hono().route("/register", register);

function pgCode(err: unknown) {
  if (err instanceof DrizzleQueryError) {
    return (err.cause as { code?: string } | undefined)?.code;
  }
  return undefined;
}

const apiRoutes = new Hono<AuthContext>()
  .use(requireAuth)
  .use(rateLimit)
  .get("/me", async (c) => {
    const userId = c.var.userId;
    const [user] = await db
      .select({ signCount: users.signCount, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, userId));
    return c.json(
      {
        userId,
        signCount: user?.signCount ?? 0,
        createdAt: user?.createdAt.toISOString() ?? null,
        apiUsedToday: await getApiUsage(userId),
        apiDailyLimit: DAILY_API_LIMIT,
        debugApi: DEBUG_API_ENABLED,
      },
      200,
    );
  })
  .delete("/me", async (c) => {
    await deleteAccount(c.var.userId);
    return c.json({ success: true }, 200);
  })
  // 開発用：今日の API 使用量を 0 に戻す
  .post("/debug/reset-api-count", async (c) => {
    if (!DEBUG_API_ENABLED) {
      throw new HTTPException(404, { message: "Not Found" });
    }
    await resetApiUsage(c.var.userId);
    return c.json({ success: true }, 200);
  })
  .route("/scan", scan)
  .route("/rules", rulesApi)
  .route("/collection", collection)
  .route("/translate", translateRule)
  .route("/report", report)
  .route("/parks", parksRoute)
  .route("/areas", areasRoute)
  .onError((err, c) => {
    console.error(err);
    if (err instanceof HTTPException)
      return c.json({ error: err.message }, err.status);
    switch (pgCode(err)) {
      case "23503":
        return c.json({ error: "referenced resource not found" }, 400);
      case "23514":
        return c.json({ error: "invalid data" }, 400);
      case "40P01":
        return c.json({ error: "conflict, please retry" }, 503);
    }

    return c.json({ error: "Internal Server Error" }, 500);
  });

const app = new Hono().route("/auth", authRoutes).route("/api", apiRoutes);

export type AppType = typeof app;

await ensureCollections(qdrantClient, Object.values(COLLECTIONS));

// serve({
//   fetch: app.fetch,
//   port: Number(process.env.PORT ?? 3000),
// });

export default {
  fetch: app.fetch,
  port: Number(process.env.PORT ?? 3000),
};
