import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "../db/client";
import { parkRules, ruleVotes } from "../db/schema";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type VoteSource = "scan" | "report" | "verify" | "suggest";

export const HIDE_MIN_NEGATIVES = 2;

export const FULL_WEIGHT = 10;
export const BONUS_YES_WEIGHT = 1;
export const BONUS_NO_WEIGHT = 3;

function isBonus(source: string): boolean {
  return source === "verify" || source === "suggest";
}

function weightOf(source: string, vote: boolean): number {
  return vote && (source === "verify" || source === "suggest")
    ? BONUS_YES_WEIGHT
    : FULL_WEIGHT;
  function isBonus(source: string): boolean {
    return source === "verify" || source === "suggest";
  }
}

export type Tally = {
  yes: number;
  no: number;
  noVoters: number;
};

export async function tallyVotes(
  tx: Tx,
  parkId: number,
  ruleId: string,
  creator: string | null,
  purpose: "hide" | "suggest",
): Promise<Tally> {
  const votes = await tx
    .select({
      userId: ruleVotes.userId,
      vote: ruleVotes.vote,
      source: ruleVotes.source,
    })
    .from(ruleVotes)
    .where(
      and(
        eq(ruleVotes.parkId, parkId),
        eq(ruleVotes.ruleId, ruleId),
        isNotNull(ruleVotes.vote),
      ),
    );

  const tally: Tally = { yes: 0, no: 0, noVoters: 0 };
  let creatorVoted = false;
  for (const v of votes) {
    if (v.vote === null) continue;
    if (v.userId === creator) creatorVoted = true;
    if (purpose === "hide" && !v.vote && v.source === "suggest") continue;
    if (v.vote) {
      tally.yes += weightOf(v.source, true);
    } else {
      tally.no += weightOf(v.source, false);
      tally.noVoters++;
    }
  }
  if (creator !== null && !creatorVoted) tally.yes += FULL_WEIGHT;
  return tally;
}

export async function castVotes(
  tx: Tx,
  userId: string,
  parkId: number,
  ruleIds: string[],
  vote: boolean,
  source: VoteSource,
): Promise<void> {
  if (ruleIds.length === 0) return;
  // ロックの順番をそろえてデッドロックを避ける
  const sorted = [...new Set(ruleIds)].sort();
  await tx
    .insert(ruleVotes)
    .values(sorted.map((ruleId) => ({ parkId, ruleId, userId, vote, source })))
    .onConflictDoUpdate({
      target: [ruleVotes.parkId, ruleVotes.ruleId, ruleVotes.userId],
      set: { vote, source, updatedAt: new Date() },
    });
}

export async function reevaluateParkRule(
  tx: Tx,
  parkId: number,
  ruleId: string,
): Promise<void> {
  const [link] = await tx
    .select({
      id: parkRules.id,
      createdBy: parkRules.createdBy,
      hiddenAt: parkRules.hiddenAt,
    })
    .from(parkRules)
    .where(and(eq(parkRules.parkId, parkId), eq(parkRules.ruleId, ruleId)))
    .for("update");
  if (!link) return;

  const t = await tallyVotes(tx, parkId, ruleId, link.createdBy, "hide");
  const hide = t.noVoters >= HIDE_MIN_NEGATIVES && t.no > t.yes;
  if (hide === (link.hiddenAt !== null)) return;
  await tx
    .update(parkRules)
    .set({ hiddenAt: hide ? new Date() : null })
    .where(eq(parkRules.id, link.id));
}

export async function reevaluateParkRules(
  tx: Tx,
  parkId: number,
  ruleIds: string[],
): Promise<void> {
  for (const ruleId of [...new Set(ruleIds)].sort()) {
    await reevaluateParkRule(tx, parkId, ruleId);
  }
}
