import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/Colors";
import { useT } from "@/lib/i18n";
import { useLanguage } from "@/lib/language";
import { getCurrentLocation, isLocationPermissionError } from "@/lib/utility";
import {
  fetchParksAround,
  formatDistance,
  mapsUrl,
  type SearchPark,
} from "@/lib/nearbySearch";
import { RuleRow } from "./RuleRow";
import { RuleIcon } from "./RuleIcon";
import type { ScannedRule } from "./types";
import { useTranslatedTexts } from "./useTranslatedTexts";

type Props = {
  visible: boolean;
  onClose: () => void;
  priorityRuleIds?: string[];
};

type Load =
  | { status: "loading" }
  | { status: "error"; reason: "permission" | "failed" }
  | { status: "ready"; parks: SearchPark[] };

type RuleEntry = { rule: ScannedRule; parkCount: number; priority: boolean };

export function RuleSearchModal({ visible, onClose, priorityRuleIds }: Props) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [language] = useLanguage();
  const t = useT();
  const seq = useRef(0);
  const insets = useSafeAreaInsets();

  const reload = useCallback(async () => {
    const id = ++seq.current;
    setLoad({ status: "loading" });
    try {
      const here = await getCurrentLocation();
      const parks = await fetchParksAround(here);
      if (id !== seq.current) return;
      setLoad({ status: "ready", parks });
    } catch (e) {
      console.warn(e);
      if (id !== seq.current) return;
      setLoad({
        status: "error",
        reason: isLocationPermissionError(e) ? "permission" : "failed",
      });
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setSelectedId(null);
    setQuery("");
    reload();
    return () => {
      seq.current++;
    };
  }, [visible, reload]);

  const parks = load.status === "ready" ? load.parks : [];

  const entries = useMemo<RuleEntry[]>(() => {
    const priority = new Set(priorityRuleIds ?? []);
    const byId = new Map<string, RuleEntry>();
    for (const park of parks) {
      for (const rule of park.rules) {
        const e = byId.get(rule.id);
        if (e) e.parkCount++;
        else
          byId.set(rule.id, {
            rule,
            parkCount: 1,
            priority: priority.has(rule.id),
          });
      }
    }
    return [...byId.values()].sort(
      (a, b) =>
        Number(b.priority) - Number(a.priority) || b.parkCount - a.parkCount,
    );
  }, [parks, priorityRuleIds]);

  const allRules = useMemo(() => entries.map((e) => e.rule), [entries]);
  const { textOf } = useTranslatedTexts(allRules, language);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q === "") return entries;
    return entries.filter(
      (e) =>
        textOf(e.rule).toLowerCase().includes(q) ||
        e.rule.text.toLowerCase().includes(q),
    );
  }, [entries, query, textOf]);

  const selected = entries.find((e) => e.rule.id === selectedId) ?? null;

  const results = useMemo(() => {
    if (selected === null) return null;
    const byDistance = (a: SearchPark, b: SearchPark) =>
      a.distanceM - b.distanceM;
    const withRule = parks
      .filter((p) => p.rules.some((r) => r.id === selected.rule.id))
      .sort(byDistance);

    const without = parks
      .filter(
        (p) =>
          p.rules.length > 0 && !p.rules.some((r) => r.id === selected.rule.id),
      )
      .sort(byDistance);
    return { withRule, without };
  }, [selected, parks]);

  const openMap = (p: SearchPark) => {
    Linking.openURL(mapsUrl(p.center)).catch((e) => console.warn(e));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {
        if (selected) setSelectedId(null);
        else onClose();
      }}
    >
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.header}>
          {selected ? (
            <Pressable
              onPress={() => setSelectedId(null)}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.headerLink}>{t.ruleSearch.back}</Text>
            </Pressable>
          ) : (
            <Text style={styles.title}>{t.ruleSearch.title}</Text>
          )}
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button">
            <Text style={styles.headerLink}>{t.common.close}</Text>
          </Pressable>
        </View>

        {load.status === "loading" ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.mutedText} />
            <Text style={styles.muted}>{t.ruleSearch.loading}</Text>
          </View>
        ) : load.status === "error" ? (
          <View style={styles.center}>
            <Text style={styles.muted}>
              {load.reason === "permission"
                ? t.common.locationNotAllowed
                : t.ruleSearch.loadFailed}
            </Text>
            <Pressable
              onPress={reload}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>{t.common.reload}</Text>
            </Pressable>
          </View>
        ) : selected && results ? (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.selected}>
              <RuleIcon
                name={selected.rule.iconName}
                iconType={selected.rule.iconType}
                size={44}
              />
              <Text style={styles.selectedText}>{textOf(selected.rule)}</Text>
            </View>

            <Text style={styles.section}>
              {t.ruleSearch.parksWithRule(results.withRule.length)}
            </Text>
            {results.withRule.map((p) => (
              <ParkItem key={p.id} park={p} onPress={() => openMap(p)} />
            ))}

            <Text style={styles.section}>
              {t.ruleSearch.parksWithoutRule(results.without.length)}
            </Text>
            <Text style={styles.caution}>{t.ruleSearch.withoutCaution}</Text>
            {results.without.length === 0 ? (
              <Text style={styles.muted}>{t.ruleSearch.none}</Text>
            ) : (
              results.without.map((p) => (
                <ParkItem key={p.id} park={p} onPress={() => openMap(p)} />
              ))
            )}
            <Text style={styles.disclaimer}>{t.parkRules.disclaimer}</Text>
          </ScrollView>
        ) : (
          <View style={styles.flex}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t.ruleSearch.filterPlaceholder}
              placeholderTextColor={Colors.mutedText}
              style={styles.input}
              clearButtonMode="while-editing"
            />
            <ScrollView contentContainerStyle={styles.content}>
              {entries.length === 0 ? (
                <Text style={styles.muted}>{t.ruleSearch.noParksNearby}</Text>
              ) : filtered.length === 0 ? (
                <Text style={styles.muted}>{t.ruleSearch.noMatch}</Text>
              ) : (
                filtered.map((e) => (
                  <Pressable
                    key={e.rule.id}
                    onPress={() => setSelectedId(e.rule.id)}
                    accessibilityRole="button"
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <RuleRow
                      iconName={e.rule.iconName}
                      iconType={e.rule.iconType}
                      title={textOf(e.rule)}
                      subtitle={t.ruleSearch.ruleSummary(e.priority, e.parkCount)}
                    />
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}

function ParkItem({
  park,
  onPress,
}: {
  park: SearchPark;
  onPress: () => void;
}) {
  const t = useT();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.park, pressed && styles.pressed]}
    >
      <View style={styles.flex}>
        <Text style={styles.parkName}>{park.name || t.common.unnamedPark}</Text>
        <Text style={styles.parkSub}>
          {t.ruleSearch.parkSummary(
            formatDistance(t, park.distanceM),
            park.rules.length,
          )}
        </Text>
      </View>
      <Text style={styles.mapLink}>{t.ruleSearch.map}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 17,
    fontWeight: "bold",
    color: Colors.text,
  },
  headerLink: {
    fontSize: 15,
    color: Colors.tint,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 24,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  input: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    color: Colors.text,
    fontSize: 15,
  },
  selected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
  },
  selectedText: {
    flex: 1,
    fontSize: 17,
    fontWeight: "bold",
    color: Colors.text,
  },
  section: {
    marginTop: 16,
    marginBottom: 4,
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.subText,
  },
  caution: {
    marginBottom: 4,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.danger,
  },
  park: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  parkName: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
  },
  parkSub: {
    marginTop: 2,
    fontSize: 13,
    color: Colors.mutedText,
  },
  mapLink: {
    fontSize: 14,
    color: Colors.tint,
  },
  muted: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.subText,
    textAlign: "center",
  },
  disclaimer: {
    marginTop: 24,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.mutedText,
    opacity: 0.8,
  },
  button: {
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.success,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  },
  pressed: {
    opacity: 0.6,
  },
});
