export type Rarity = "common" | "rare" | "epic" | "legend";

const THRESHOLDS: readonly (readonly [Exclude<Rarity, "common">, number])[] = [
  ["legend", 0.05],
  ["epic", 0.15],
  ["rare", 0.45],
];

export function rarityOf(ruleTotal: number, typicalTotal: number): Rarity {
  if (!(ruleTotal > 0) || !(typicalTotal > 0)) return "common";
  const ratio = ruleTotal / typicalTotal;
  for (const [rarity, max] of THRESHOLDS) {
    if (ratio < max) return rarity;
  }
  return "common";
}

export function referenceTotal(sumOfSquares: number, sum: number): number {
  return sum > 0 && sumOfSquares > 0 ? sumOfSquares / sum : 0;
}
