export type Rarity = "common" | "rare" | "epic" | "legend";

const THRESHOLDS: readonly (readonly [Exclude<Rarity, "common">, number])[] = [
  ["legend", 0.1],
  ["epic", 0.25],
  ["rare", 0.5],
];

export function rarityOf(
  ruleTotal: number,
  allTotal: number,
  kinds: number,
): Rarity {
  if (!(kinds > 0) || !(allTotal > 0) || !(ruleTotal >= 0)) return "common";
  const ratio = ((ruleTotal + 1) * kinds) / (allTotal + kinds);
  for (const [rarity, max] of THRESHOLDS) {
    if (ratio < max) return rarity;
  }
  return "common";
}
