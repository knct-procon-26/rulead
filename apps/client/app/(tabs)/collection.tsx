import { StyleSheet } from "react-native";

import EditScreenInfo from "@/components/EditScreenInfo";
import { Text, View } from "@/components/Themed";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Icon } from "@/components/Icon";
import { useFocusEffect } from "expo-router";

type Badge = { badgeType: "new" | "+1" | "none" };

type Rule = {
  id: string;
  count: number;
  textEn: string;
  iconName: string;
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

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const res = await api.api.collection.$get();
        const data = await res.json();
        setSignCount(data.signCount);
        setRules(
          data.rules.map((i) => ({
            id: i.id,
            count: i.count,
            textEn: i.textEn,
            iconName: i.iconName,
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
              <Icon name={i.iconName} />
              <Text>
                {i.textEn} | {i.count} | {i.badge.badgeType}
              </Text>
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
