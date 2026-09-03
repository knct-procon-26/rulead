import { Hono } from "hono";
import scan from "./scan";
import test from "./test";
import { serve } from "bun";
import { qdrantClient } from "./lib/qdrantClient";
import { ensureRulesCollection } from "./lib/qdrantSetup";

const app = new Hono();

const routes = app
  .get("/", (c) => {
    return c.text("Hello Hono!");
  })
  .route("/api/scan", scan)
  .route("/api/test", test);

export type AppType = typeof routes;

await ensureRulesCollection(qdrantClient);

// serve({
//   fetch: app.fetch,
//   port: Number(process.env.PORT ?? 3000),
// });

export default {
  fetch: app.fetch,
  port: Number(process.env.PORT ?? 3000),
};
