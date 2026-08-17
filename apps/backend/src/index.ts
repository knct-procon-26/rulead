import { Hono } from "hono";
import scan from "./scan";
import { serve } from "bun";

const app = new Hono();

const routes = app
  .get("/", (c) => {
    return c.text("Hello Hono!");
  })
  .route("/api/scan", scan);

export type AppType = typeof routes;

serve({
  fetch: app.fetch,
  port: 3000,
});

export default app;
