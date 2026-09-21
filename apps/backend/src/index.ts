import { Hono } from "hono";
import scan from "./scan";
import test from "./test";
import { serve } from "bun";
import { qdrantClient } from "./lib/qdrantClient";
import { ensureRulesCollection } from "./lib/qdrantSetup";
import { AuthContext, requireAuth } from "./auth";
import register from "./register";
import { HTTPException } from "hono/http-exception";
import { DrizzleQueryError } from "drizzle-orm";
import rulesApi from "./rules";
import collection from "./collection";

const authRoutes = new Hono().route("/register", register);

function pgCode(err: unknown) {
  if (err instanceof DrizzleQueryError) {
    return (err.cause as { code?: string } | undefined)?.code;
  }
  return undefined;
}

const apiRoutes = new Hono<AuthContext>()
  .use(requireAuth)
  .get("/me", (c) => c.json({ userId: c.var.userId }))
  .route("/scan", scan)
  .route("/test", test)
  .route("/rules", rulesApi)
  .route("/collection", collection)
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

await ensureRulesCollection(qdrantClient);

// serve({
//   fetch: app.fetch,
//   port: Number(process.env.PORT ?? 3000),
// });

export default {
  fetch: app.fetch,
  port: Number(process.env.PORT ?? 3000),
};
