import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { api } from "@/lib/client";
import {
  apiErrorMessage,
  networkErrorMessage,
  viewError,
} from "@/lib/utility";
import { useT } from "@/lib/i18n";
import { useLanguage } from "@/lib/language";
import Colors from "@/constants/Colors";
import { RuleRow } from "@/components/rules/RuleRow";
import { LanguagePicker } from "@/components/rules/LanguagePicker";
import { useTranslatedTexts } from "@/components/rules/useTranslatedTexts";
import { toIconType, type DisplayRule } from "@/components/rules/types";
import {
  SortPicker,
  type SortOption,
} from "@/components/collection/SortPicker";
import * as ParkTracker from "@/modules/park-tracker";

type Badge = "new" | "+1" | "none";
type Rarity = "common" | "rare" | "epic" | "legend";

type CollectedRule = DisplayRule & {
  count: number;
  total: number;
  lastCollectedAt: number;
  rarity: Rarity;
};

const BADGE_MINUTES = 60;

function chooseBadge(count: number, lastCollectedAt: number): Badge {
  if ((Date.now() - lastCollectedAt) / (1000 * 60) >= BADGE_MINUTES)
    return "none";
  return count === 1 ? "new" : "+1";
}

type SortKey = "recent" | "oldest" | "rarest" | "commonest" | "most" | "fewest";

const SORT_KEYS: readonly SortKey[] = [
  "recent",
  "oldest",
  "rarest",
  "commonest",
  "most",
  "fewest",
];

type Compare = (a: CollectedRule, b: CollectedRule) => number;

const byId: Compare = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const byRecent: Compare = (a, b) =>
  b.lastCollectedAt - a.lastCollectedAt || byId(a, b);

const COMPARATORS: Record<SortKey, Compare> = {
  recent: byRecent,
  oldest: (a, b) => a.lastCollectedAt - b.lastCollectedAt || byId(a, b),
  rarest: (a, b) => a.total - b.total || byRecent(a, b),
  commonest: (a, b) => b.total - a.total || byRecent(a, b),
  most: (a, b) => b.count - a.count || byRecent(a, b),
  fewest: (a, b) => a.count - b.count || byRecent(a, b),
};

const RARITY_LOOK: Record<
  Exclude<Rarity, "common">,
  { label: string; color: string; tint: string }
> = {
  rare: { label: "RARE", color: "#1c7ed6", tint: "#f2f8ff" },
  epic: { label: "EPIC", color: "#9c36b5", tint: "#fbf4fd" },
  legend: { label: "LEGEND", color: "#e67700", tint: "#fff8ec" },
};

function lookOf(rarity: Rarity | undefined) {
  if (rarity === "rare" || rarity === "epic" || rarity === "legend")
    return RARITY_LOOK[rarity];
  return null;
}

async function countVisitedParks(): Promise<number | null> {
  try {
    const visits = await ParkTracker.getVisits(0);
    return new Set(visits.map((v) => v.parkId)).size;
  } catch {
    return null;
  }
}

export default function CollectionTab() {
  const [signCount, setSignCount] = useState<number | null>(null);
  const [parkCount, setParkCount] = useState<number | null>(null);
  const [rules, setRules] = useState<CollectedRule[] | null>(null);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [language, setLanguage] = useLanguage();
  const { textOf } = useTranslatedTexts(rules ?? [], language);
  const t = useT();
  const sortOptions = useMemo<readonly SortOption<SortKey>[]>(
    () => SORT_KEYS.map((key) => ({ value: key, label: t.collection.sort[key] })),
    [t],
  );

  const sortedRules = useMemo(
    () => (rules === null ? null : [...rules].sort(COMPARATORS[sortKey])),
    [rules, sortKey],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setFailed(false);
      countVisitedParks().then((n) => {
        if (!cancelled) setParkCount(n);
      });
      (async () => {
        try {
          const res = await api.api.collection.$get();
          if (!res.ok) {
            const err = await res.json();
            if (cancelled) return;
            setFailed(true);
            await viewError(apiErrorMessage(res.status, err.error));
            return;
          }
          const data = await res.json();
          if (cancelled) return;
          setSignCount(data.signCount);
          setTotal(data.total ?? 0);
          setRules(
            data.rules.map((i) => ({
              id: i.id,
              text: i.textEn,
              iconName: i.iconName,
              iconType: toIconType(i.iconType),
              count: i.count,
              total: i.total,
              lastCollectedAt: new Date(i.lastCollectedAt).getTime(),
              rarity: i.rarity,
            })),
          );
        } catch {
          if (cancelled) return;
          setFailed(true);
          await viewError(networkErrorMessage());
        }
      })();

      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (sortedRules === null) {
    return (
      <View style={styles.center}>
        {failed ? (
          <Text style={styles.empty}>{t.collection.loadFailed}</Text>
        ) : (
          <ActivityIndicator size="large" color={Colors.mutedText} />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{t.collection.signs}</Text>
          <Text style={styles.statValue}>{signCount ?? "-"}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>{t.collection.parks}</Text>
          <Text style={styles.statValue}>{parkCount ?? "-"}</Text>
        </View>
      </View>
      <View style={styles.toolbar}>
        <SortPicker
          value={sortKey}
          options={sortOptions}
          onChange={setSortKey}
        />
        <LanguagePicker value={language} onChange={setLanguage} />
      </View>

      <FlatList
        data={sortedRules}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>{t.collection.empty}</Text>
        }
        renderItem={({ item }) => {
          const badge = chooseBadge(item.count, item.lastCollectedAt);
          const look = lookOf(item.rarity);
          const row = (
            <RuleRow
              iconName={item.iconName}
              iconType={item.iconType}
              title={textOf(item)}
              subtitle={
                total > 0
                  ? t.collection.share(((item.total / total) * 100).toFixed(1))
                  : undefined
              }
              style={look ? styles.rowInCard : undefined}
              right={
                <View style={styles.right}>
                  {badge !== "none" ? (
                    <Text
                      style={[
                        styles.badge,
                        badge === "new" ? styles.badgeNew : styles.badgePlus,
                      ]}
                    >
                      {badge === "new" ? "NEW" : "+1"}
                    </Text>
                  ) : null}
                  <Text style={styles.count}>
                    <Text style={styles.countMark}>×</Text>
                    {item.count}
                  </Text>
                </View>
              }
            />
          );
          if (!look) return row;

          return (
            <View style={styles.rareWrap}>
              <View
                style={[
                  styles.rareCard,
                  { borderColor: look.color, backgroundColor: look.tint },
                ]}
              >
                <View
                  style={styles.watermarkBox}
                  pointerEvents="none"
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  <Text
                    style={[styles.watermark, { color: look.color }]}
                    numberOfLines={1}
                  >
                    {look.label}
                  </Text>
                </View>
                {row}
              </View>
              <Text style={[styles.stamp, { backgroundColor: look.color }]}>
                {look.label}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  stats: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.subText,
  },
  statValue: {
    marginTop: 2,
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.text,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 20,
  },
  empty: {
    marginTop: 40,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.subText,
    textAlign: "center",
  },
  // バッジを数字の真上に置く
  right: {
    alignItems: "center",
    gap: 2,
    minWidth: 48,
  },
  badge: {
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: "bold",
    color: "#ffffff",
  },
  badgeNew: {
    backgroundColor: Colors.success,
  },
  badgePlus: {
    backgroundColor: "#f08c00",
  },
  count: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.text,
  },
  countMark: {
    fontSize: 15,
    fontWeight: "bold",
    color: Colors.subText,
  },
  rareWrap: {
    marginHorizontal: -10,
    marginTop: 10,
    marginBottom: 4,
  },
  rareCard: {
    overflow: "hidden",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 9,
  },
  rowInCard: {
    borderBottomWidth: 0,
  },
  watermarkBox: {
    ...StyleSheet.absoluteFill,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 60,
  },
  watermark: {
    fontSize: 34,
    fontWeight: "900",
    fontStyle: "italic",
    opacity: 0.08,
    transform: [{ rotate: "-8deg" }],
  },
  stamp: {
    position: "absolute",
    top: -7,
    left: 2,
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: "800",
    fontStyle: "italic",
    letterSpacing: 0.5,
    color: "#ffffff",
    transform: [{ rotate: "-6deg" }],
  },
});
