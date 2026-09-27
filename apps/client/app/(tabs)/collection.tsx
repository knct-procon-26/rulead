import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { api } from "@/lib/client";
import { viewError } from "@/lib/utility";
import { useLanguage } from "@/lib/language";
import Colors from "@/constants/Colors";
import { RuleRow } from "@/components/rules/RuleRow";
import { LanguagePicker } from "@/components/rules/LanguagePicker";
import { useTranslatedTexts } from "@/components/rules/useTranslatedTexts";
import { toIconType, type DisplayRule } from "@/components/rules/types";

type Badge = "new" | "+1" | "none";

type CollectedRule = DisplayRule & {
  count: number;
  total: number;
  lastCollectedAt: number;
};

const BADGE_MINUTES = 60;

function chooseBadge(count: number, lastCollectedAt: number): Badge {
  if ((Date.now() - lastCollectedAt) / (1000 * 60) >= BADGE_MINUTES)
    return "none";
  return count === 1 ? "new" : "+1";
}

export default function CollectionTab() {
  const [signCount, setSignCount] = useState<number | null>(null);
  const [rules, setRules] = useState<CollectedRule[] | null>(null);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);
  const [language, setLanguage] = useLanguage();
  const { textOf } = useTranslatedTexts(rules ?? [], language);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setFailed(false);
      (async () => {
        try {
          const res = await api.api.collection.$get();
          if (!res.ok) {
            const err = await res.json();
            if (cancelled) return;
            setFailed(true);
            await viewError(err.error);
            return;
          }
          const data = await res.json();
          if (cancelled) return;
          setSignCount(data.signCount);
          setTotal(data.total ?? 0);
          setRules(
            data.rules
              .map((i) => ({
                id: i.id,
                text: i.textEn,
                iconName: i.iconName,
                iconType: toIconType(i.iconType),
                count: i.count,
                total: i.total,
                lastCollectedAt: new Date(i.lastCollectedAt).getTime(),
              }))
              .sort((a, b) => b.lastCollectedAt - a.lastCollectedAt),
          );
        } catch {
          if (cancelled) return;
          setFailed(true);
          await viewError("Failed to connect with API.");
        }
      })();

      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (rules === null) {
    return (
      <View style={styles.center}>
        {failed ? (
          <Text style={styles.empty}>
            読み込めませんでした。{"\n"}タブを開き直すと再読み込みします。
          </Text>
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
          <Text style={styles.statLabel}>撮影した看板</Text>
          <Text style={styles.statValue}>{signCount ?? "-"}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>訪れた公園</Text>
          {/* TODO: 訪れた公園の数 */}
          <Text style={styles.statValue}>-</Text>
        </View>
      </View>
      <View style={styles.toolbar}>
        <LanguagePicker value={language} onChange={setLanguage} />
      </View>

      <FlatList
        data={rules}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>
            まだコレクションがありません。{"\n"}
            看板を撮影してどんどんルールを集めましょう！
          </Text>
        }
        renderItem={({ item }) => {
          const badge = chooseBadge(item.count, item.lastCollectedAt);
          return (
            <RuleRow
              iconName={item.iconName}
              iconType={item.iconType}
              title={textOf(item)}
              subtitle={
                total > 0
                  ? `全体の ${((item.total / total) * 100).toFixed(1)}%`
                  : undefined
              }
              right={
                <>
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
                  <Text style={styles.count}>×{item.count}</Text>
                </>
              }
            />
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    position: "absolute",
    left: "3%",
    bottom: 0,
    fontSize: 20,
    fontWeight: "600",
  },
  bar: {
    height: 1,
    marginHorizontal: 20,
    backgroundColor: Colors.border,
  },
  line: {
    position: "absolute",
    left: "3%",
    height: 3,
    width: "94%",
    bottom: 0,
    backgroundColor: "black",
  },
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
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  empty: {
    marginTop: 40,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.subText,
    textAlign: "center",
  },
  badge: {
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 12,
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
    fontSize: 15,
    fontWeight: "bold",
    color: Colors.text,
  },
  check: {
    position: "absolute",
    borderWidth: 2,
    width: "40%",
    height: "55%",
    top: "10%",
    left: "5%",
    borderRadius: 10,
  },
  check2: {
    position: "absolute",
    borderWidth: 2,
    width: "40%",
    height: "55%",
    top: "10%",
    right: "5%",
    borderRadius: 10,
  },
  font: {
    fontSize: 17,
    fontWeight: "600",
  },
  font2: {
    fontSize: 40,
    fontWeight: "600",
    textAlign: "center",
  },
  font3: {
    position: "absolute",
    left: "70%",
    top: "65%",
  },
  text: {
    position: "absolute",
    fontSize: 18,
    fontWeight: "700",
    left: "12%",
    right: "18%",
    textAlignVertical: "center",
    height: 50,
  },
  new: {
    position: "absolute",
    left: "89%",
    top: 0,
    fontSize: 13,
    paddingVertical: 2,
    paddingHorizontal: 5,
    color: "white",
    fontWeight: "700",
    backgroundColor: "rgb(251, 190, 7)",
    borderRadius: 20,
  },
  increment: {
    position: "absolute",
    left: "89%",
    top: 0,
    fontSize: 13,
    paddingVertical: 1,
    paddingHorizontal: 6,
    color: "white",
    fontWeight: "700",
    backgroundColor: "rgb(44, 188, 0)",
    borderRadius: 20,
  },
});
