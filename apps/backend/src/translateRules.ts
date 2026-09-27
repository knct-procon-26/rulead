import { Hono } from "hono";
import z from "zod";
import { inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "./lib/validator";
import { db } from "./db/client";
import { rules as rulesTable } from "./db/schema";
import { LANGUAGE_CODE_RE, translateRuleTexts } from "./lib/ruleTranslate";

const app = new Hono();

const translateSchema = z.object({
  rules: z
    .array(
      z.object({
        id: z.uuid(),
        text: z.string(),
      }),
    )
    .max(500),
  to: z.string().regex(LANGUAGE_CODE_RE),
});

const translateRule = app.post(
  "/",
  zValidator("json", translateSchema),
  async (c) => {
    const data = c.req.valid("json");
    const ids = [...new Set(data.rules.map((r) => r.id))];

    const sources =
      ids.length === 0
        ? []
        : await db
            .select({ id: rulesTable.id, text: rulesTable.textEn })
            .from(rulesTable)
            .where(inArray(rulesTable.id, ids));
    if (sources.length !== ids.length) {
      throw new HTTPException(400, {
        message: "referenced resource not found",
      });
    }

    const translated = await translateRuleTexts(sources, data.to);

    return c.json(
      {
        success: true,
        rules: data.rules.map((r) => ({
          id: r.id,
          text: translated.get(r.id) ?? "",
        })),
        language: data.to,
      },
      200,
    );
  },
);

export default translateRule;
