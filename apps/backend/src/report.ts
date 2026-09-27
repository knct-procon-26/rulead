import img2rules from "./lib/img2rules";
import { Hono } from "hono";
import z from "zod";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "./lib/validator";
import { db } from "./db/client";
import { reports } from "./db/schema";
import { AuthContext } from "./auth";
const app = new Hono<AuthContext>();
const extractRulesSchema = z.object({
  parkId: z.number().nullable(),
  ruleId: z.uuid().nullable(),
  reason: z.string(),
});
const report = app.post(
  "/",
  zValidator("json", extractRulesSchema),
  async (c) => {
    const data = c.req.valid("json");

    await db.insert(reports).values({
      reporterId: c.var.userId,
      parkId: data.parkId,
      ruleId: data.ruleId,
      reason: data.reason,
    });

    return c.json(
      {
        success: true,
      },
      200,
    );
  },
);

export default report;
