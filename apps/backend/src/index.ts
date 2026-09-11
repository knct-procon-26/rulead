import { Hono } from "hono";
import scan from "./scan";
import test from "./test";
import { serve } from "bun";
import { qdrantClient } from "./lib/qdrantClient";
import { ensureRulesCollection } from "./lib/qdrantSetup";
import { AuthContext, requireAuth } from "./auth";
import register from "./register";

const authRoutes = new Hono().route("/register", register);

const apiRoutes = new Hono<AuthContext>()
  .use(requireAuth)
  .get("/me", (c) => c.json({ userId: c.var.userId }))
  .route("/scan", scan)
  .route("/test", test);

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
