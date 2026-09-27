import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db/client";
import { ruleTranslations } from "../db/schema";
import { googleTranslate } from "./translation";

export const RULE_SOURCE_LANGUAGE = "en";

export const LANGUAGE_CODE_RE = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;

export async function translateRuleTexts(
  rules: { id: string; text: string }[],
  to: string,
): Promise<Map<string, string>> {
  const unique = [...new Map(rules.map((r) => [r.id, r])).values()];
  const result = new Map<string, string>();
  if (unique.length === 0) return result;
  if (to === RULE_SOURCE_LANGUAGE) {
    for (const r of unique) result.set(r.id, r.text);
    return result;
  }

  const cached = await db
    .select({ ruleId: ruleTranslations.ruleId, text: ruleTranslations.text })
    .from(ruleTranslations)
    .where(
      and(
        inArray(
          ruleTranslations.ruleId,
          unique.map((r) => r.id),
        ),
        eq(ruleTranslations.languageCode, to),
      ),
    );
  for (const row of cached) result.set(row.ruleId, row.text);

  const missing = unique.filter((r) => !result.has(r.id));
  if (missing.length === 0) return result;

  const translated = await googleTranslate(
    missing.map((r) => r.text),
    RULE_SOURCE_LANGUAGE,
    to,
  );
  const rows = missing.map((r, i) => ({
    ruleId: r.id,
    languageCode: to,
    text: translated[i] ?? "",
  }));
  for (const row of rows) result.set(row.ruleId, row.text);

  // 同時リクエストが同じキーを違う順番で入れるとデッドロックするので、ID順に入れる
  const sorted = rows
    .filter((r) => r.text !== "")
    .sort((a, b) => (a.ruleId < b.ruleId ? -1 : a.ruleId > b.ruleId ? 1 : 0));
  if (sorted.length > 0) {
    await db
      .insert(ruleTranslations)
      .values(sorted)
      .onConflictDoNothing({
        target: [ruleTranslations.ruleId, ruleTranslations.languageCode],
      });
  }
  return result;
}
