import { Hono } from "hono";
import z from "zod";
import { HTTPException } from "hono/http-exception";
import { and, eq, isNull } from "drizzle-orm";
import { zValidator } from "./lib/validator";
import { db } from "./db/client";
import { parkRules, reports } from "./db/schema";
import { AuthContext } from "./auth";
import { castVotes, reevaluateParkRule } from "./lib/ruleVotes";

const app = new Hono<AuthContext>();

const reportSchema = z.object({
  parkId: z.number().int().positive().nullable(),
  ruleId: z.uuid().nullable(),
  reason: z.string().trim().min(1).max(200),
});

const report = app.post("/", zValidator("json", reportSchema), async (c) => {
  const data = c.req.valid("json");
  const userId = c.var.userId;
  if (data.parkId === null && data.ruleId === null) {
    throw new HTTPException(400, { message: "invalid data" });
  }

  await db.transaction(async (tx) => {
    const [dup] = await tx
      .select({ id: reports.id })
      .from(reports)
      .where(
        and(
          eq(reports.reporterId, userId),
          data.parkId === null
            ? isNull(reports.parkId)
            : eq(reports.parkId, data.parkId),
          data.ruleId === null
            ? isNull(reports.ruleId)
            : eq(reports.ruleId, data.ruleId),
          isNull(reports.resolvedAt),
        ),
      )
      .limit(1);
    if (!dup) {
      await tx.insert(reports).values({
        reporterId: userId,
        parkId: data.parkId,
        ruleId: data.ruleId,
        reason: data.reason,
      });
    }

    if (data.parkId !== null && data.ruleId !== null) {
      const [link] = await tx
        .select({ id: parkRules.id })
        .from(parkRules)
        .where(
          and(
            eq(parkRules.parkId, data.parkId),
            eq(parkRules.ruleId, data.ruleId),
          ),
        )
        .limit(1);
      if (link) {
        await castVotes(
          tx,
          userId,
          data.parkId,
          [data.ruleId],
          false,
          "report",
        );
        await reevaluateParkRule(tx, data.parkId, data.ruleId);
      }
    }
  });

  return c.json({ success: true }, 200);
});

export default report;
