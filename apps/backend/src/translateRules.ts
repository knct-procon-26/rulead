import { Hono } from "hono";
import z from "zod";
import { zValidator } from "./lib/validator";
import { db } from "./db/client";
import { ruleTranslations } from "./db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { googleTranslate } from "./lib/translation";
const app = new Hono();
const extractRulesSchema = z.object({
  rules: z.array(
    z.object({
      id: z.uuid(),
      text: z.string(),
    }),
  ),
  to: z.string(),
});

const translateRule = app.post(
  "/",
  zValidator("json", extractRulesSchema),
  async (c) => {
    const data = c.req.valid("json");
    const results: { [id: string]: string } = Object.fromEntries(
      data.rules.map((i) => [i.id, ""]),
    );
    const uniqueRules = [...new Map(data.rules.map((r) => [r.id, r])).values()];
    const ruleIds = uniqueRules.map((i) => i.id);

    const cached =
      ruleIds.length === 0
        ? []
        : await db
            .select({
              ruleId: ruleTranslations.ruleId,
              text: ruleTranslations.text,
            })
            .from(ruleTranslations)
            .where(
              and(
                inArray(ruleTranslations.ruleId, ruleIds),
                eq(ruleTranslations.languageCode, data.to),
              ),
            );

    for (const row of cached) results[row.ruleId] = row.text;

    const needToTranslate = uniqueRules.filter((i) => results[i.id] === "");

    if (needToTranslate.length !== 0) {
      const translated = await googleTranslate(
        needToTranslate.map((i) => i.text),
        "en",
        data.to,
      );

      const rows = needToTranslate.map((v, i) => ({
        ruleId: v.id,
        languageCode: data.to,
        text: translated[i],
      }));
      for (const row of rows) results[row.ruleId] = row.text;

      const sorted = [...rows].sort((a, b) =>
        a.ruleId < b.ruleId ? -1 : a.ruleId > b.ruleId ? 1 : 0,
      );
      await db
        .insert(ruleTranslations)
        .values(sorted)
        .onConflictDoNothing({
          target: [ruleTranslations.ruleId, ruleTranslations.languageCode],
        });
    }

    return c.json(
      {
        success: true,
        rules: data.rules.map((i) => ({
          id: i.id,
          text: results[i.id],
        })),
        language: data.to,
      },
      200,
    );
  },
);

export default translateRule;
