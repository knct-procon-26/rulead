import { isNotNull } from "drizzle-orm";
import { db } from "../src/db/client";
import {
  collections,
  keywords,
  parkRules,
  reports,
  ruleKeywords,
  ruleTranslations,
  ruleVotes,
  rules,
} from "../src/db/schema";
import { qdrantClient } from "../src/lib/qdrantClient";

const RULES_COLLECTION = "rules";
const RULES_VECTOR_SIZE = 1536;

async function main() {
  if (!process.argv.includes("--yes")) {
    console.error(
      "全公園のルール・キーワード・コレクション・ルールへの投票と通報を削除します。実行するには --yes を付けてください。",
    );
    process.exitCode = 2;
    return;
  }

  const deleted = await db.transaction(async (tx) => {
    const counts: Record<string, number> = {};
    counts.rule_keywords = (await tx.delete(ruleKeywords)).rowCount ?? 0;
    counts.rule_translations = (await tx.delete(ruleTranslations)).rowCount ?? 0;
    counts.rule_votes = (await tx.delete(ruleVotes)).rowCount ?? 0;
    counts.park_rules = (await tx.delete(parkRules)).rowCount ?? 0;
    counts.collections = (await tx.delete(collections)).rowCount ?? 0;
    counts.reports = (await tx.delete(reports).where(isNotNull(reports.ruleId)))
      .rowCount ?? 0;
    counts.rules = (await tx.delete(rules)).rowCount ?? 0;
    counts.keywords = (await tx.delete(keywords)).rowCount ?? 0;
    return counts;
  });
  console.log("[resetRules] DB:", deleted);

  const { exists } = await qdrantClient.collectionExists(RULES_COLLECTION);
  if (exists) await qdrantClient.deleteCollection(RULES_COLLECTION);
  await qdrantClient.createCollection(RULES_COLLECTION, {
    vectors: { size: RULES_VECTOR_SIZE, distance: "Cosine" },
  });
  console.log(`[resetRules] qdrant: "${RULES_COLLECTION}" を空にしました`);
}

main()
  .catch((err) => {
    console.error("[resetRules] failed", err);
    process.exitCode = 1;
  })
  .finally(() => db.$client.end());
