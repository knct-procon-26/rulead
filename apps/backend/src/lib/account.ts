import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { collections, reports, ruleVotes, users } from "../db/schema";
import { generateToken, hashToken } from "../auth";
import { reevaluateParkRule } from "./ruleVotes";

export async function deleteAccount(userId: string): Promise<void> {
  const deadTokenHash = await hashToken(generateToken());
  await db.transaction(async (tx) => {
    const votes = await tx
      .delete(ruleVotes)
      .where(eq(ruleVotes.userId, userId))
      .returning({ parkId: ruleVotes.parkId, ruleId: ruleVotes.ruleId });
    await tx.delete(collections).where(eq(collections.userId, userId));
    await tx.delete(reports).where(eq(reports.reporterId, userId));
    await tx
      .update(users)
      .set({
        tokenHash: deadTokenHash,
        signCount: 0,
        apiCallCount: 0,
        deletedAt: new Date(),
      })
      .where(eq(users.id, userId));

    const pairs = [
      ...new Map(votes.map((v) => [`${v.parkId}\n${v.ruleId}`, v])).values(),
    ].sort((a, b) =>
      a.parkId !== b.parkId
        ? a.parkId - b.parkId
        : a.ruleId < b.ruleId
          ? -1
          : a.ruleId > b.ruleId
            ? 1
            : 0,
    );
    for (const p of pairs) await reevaluateParkRule(tx, p.parkId, p.ruleId);
  });
}
