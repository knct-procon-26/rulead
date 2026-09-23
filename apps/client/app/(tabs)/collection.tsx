import { StyleSheet } from "react-native";

import EditScreenInfo from "@/components/EditScreenInfo";
import { Text, View } from "@/components/Themed";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Icon } from "@/components/Icon";
import { useFocusEffect } from "expo-router";
import { viewError } from "@/lib/utility";

type Badge = { badgeType: "new" | "+1" | "none" };

type Rule = {
  id: string;
  count: number;
  textEn: string;
  iconName: string;
  iconType: string;
  total: number;
  badge: Badge;
};

function chooseBadge(count: number, lastCollectedAt: Date): Badge {
  const now = new Date();
  if ((now.getTime() - lastCollectedAt.getTime()) / (1000 * 60) < 60) {
    if (count === 1) {
      return { badgeType: "new" };
    } else {
      return { badgeType: "+1" };
    }
  } else {
    return { badgeType: "none" };
  }
}

export default function CollectionTab() {
  const [signCount, setSignCount] = useState<number | null>(null);
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const res = await api.api.collection.$get();
        if (!res.ok) {
          const err = await res.json();
          await viewError(err.error);
          return;
        }
        const data = await res.json();
        setSignCount(data.signCount);
        setTotal(data.total);
        setRules(
          data.rules.map((i) => ({
            id: i.id,
            count: i.count,
            textEn: i.textEn,
            iconName: i.iconName,
            iconType: i.iconType,
            total: i.total,
            badge: chooseBadge(i.count, new Date(i.lastCollectedAt)),
          })),
        );
      })();

      return () => {
        setRules(null);
      };
    }, []),
  );

  return (
    <View style={styles.container}>
      {rules ? (
        <View style={styles.container}>
          <Text>撮影した看板：{signCount}</Text>
          <Text>訪れた公園：{"TODO"}</Text>
          {rules.map((i) => (
            <View key={i.id} style={styles.rule}>
              <Icon
                name={i.iconName}
                iconType={
                  i.iconType as "prohibition" | "caution" | "information"
                }
              />
              <Text>
                {i.textEn} | {i.count} | {i.badge.badgeType}
              </Text>
              {total !== null && total !== 0 ? (
                <Text>{(i.total / total) * 100} %</Text>
              ) : (
                <></>
              )}
            </View>
          ))}
        </View>
      ) : (
        <Text>読み込み中...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rule: {
    flexDirection: "row",
  },
});
