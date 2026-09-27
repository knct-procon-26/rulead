import { sql } from "drizzle-orm";
import { db } from "../db/client";
import { ruleVotes } from "../db/schema";
import { loadRules, type RuleResult } from "./createRule";

const BONUS_CHANCE = 0.7;
const NEARBY_M = 1000;
const NEARBY_BBOX_DEG = 0.02;

export type BonusKind = "verify" | "suggest";

export type Bonus = {
  kind: BonusKind;
  parkId: number;
  parkName: string;
  rule: RuleResult;
};

export async function pickBonus(
  userId: string,
  parkId: number,
): Promise<Bonus | null> {
  if (Math.random() >= BONUS_CHANCE) return null;

  const verify = await db.execute<{ rule_id: string; park_name: string }>(sql`
    SELECT pr.rule_id, p.name AS park_name
    FROM park_rules pr
    JOIN parks p ON p.id = pr.park_id
    WHERE pr.park_id = ${parkId}
      AND p.deleted_at IS NULL
      AND pr.hidden_at IS NULL
      AND pr.created_by <> ${userId}
      AND NOT EXISTS (
        SELECT 1 FROM rule_votes v
        WHERE v.park_id = pr.park_id AND v.rule_id = pr.rule_id AND v.user_id = ${userId}
      )
    ORDER BY (
      SELECT count(*) FROM rule_votes v2
      WHERE v2.park_id = pr.park_id AND v2.rule_id = pr.rule_id AND v2.vote IS NOT NULL
    ) ASC, random()
    LIMIT 1
  `);

  let kind: BonusKind;
  let row = verify.rows[0];
  if (row) {
    kind = "verify";
  } else {
    const suggest = await db.execute<{
      rule_id: string;
      park_name: string;
    }>(sql`
      WITH target AS (
        SELECT id, name, area FROM parks WHERE id = ${parkId} AND deleted_at IS NULL
      )
      SELECT pr.rule_id, t.name AS park_name
      FROM target t
      JOIN parks p
        ON p.id <> t.id
        AND p.deleted_at IS NULL
        AND p.area && ST_Expand(t.area, ${NEARBY_BBOX_DEG}::float8)
        AND ST_DWithin(p.area::geography, t.area::geography, ${NEARBY_M}::float8)
      JOIN park_rules pr ON pr.park_id = p.id AND pr.hidden_at IS NULL
      WHERE NOT EXISTS (
          SELECT 1 FROM park_rules x WHERE x.park_id = t.id AND x.rule_id = pr.rule_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM rule_votes v
          WHERE v.park_id = t.id AND v.rule_id = pr.rule_id AND v.user_id = ${userId}
        )
      GROUP BY pr.rule_id, t.name
      ORDER BY count(DISTINCT pr.park_id) DESC, random()
      LIMIT 1
    `);
    row = suggest.rows[0];
    if (!row) return null;
    kind = "suggest";
  }

  const rule = (await loadRules([row.rule_id])).get(row.rule_id);
  if (!rule) return null;

  const inserted = await db
    .insert(ruleVotes)
    .values({ parkId, ruleId: rule.id, userId, vote: null, source: kind })
    .onConflictDoNothing({
      target: [ruleVotes.parkId, ruleVotes.ruleId, ruleVotes.userId],
    })
    .returning({ id: ruleVotes.id });
  if (inserted.length === 0) return null;

  return { kind, parkId, parkName: row.park_name, rule };
}
