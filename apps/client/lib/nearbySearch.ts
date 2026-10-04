import type { Messages } from "@/lib/i18n";

// iOS 版では「近くの公園を探す」画面がないため、スキャンの地図で使う距離表示だけを残している。
export function formatDistance(t: Messages, m: number): string {
  if (m <= 0) return t.ruleSearch.distanceHere;
  if (m < 1000)
    return t.ruleSearch.distanceAbout(`${Math.max(10, Math.round(m / 10) * 10)}m`);
  return t.ruleSearch.distanceAbout(`${(m / 1000).toFixed(1)}km`);
}
