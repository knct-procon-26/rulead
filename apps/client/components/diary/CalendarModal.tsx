import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import Colors from "@/constants/Colors";
import {
  addMonths,
  dayKey,
  dayKeyOf,
  formatDayLabel,
  formatTime,
  monthIndex,
  monthMatrix,
  parseDay,
  type DiaryPage,
  type YearMonth,
} from "@/lib/diary";

const WEEK_HEADER = ["日", "月", "火", "水", "木", "金", "土"];

type Props = {
  visible: boolean;
  pages: DiaryPage[];
  currentDay: string | null;
  onSelect: (pageIndex: number) => void;
  onClose: () => void;
};

const ymOf = (day: string | null): YearMonth | null => {
  const p = day ? parseDay(day) : null;
  return p ? { y: p.y, m: p.m } : null;
};

export function CalendarModal({
  visible,
  pages,
  currentDay,
  onSelect,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const today = dayKeyOf(Date.now());
  const todayYm = ymOf(today)!;

  const minYm = ymOf(pages[0]?.day ?? null) ?? todayYm;
  const lastYm = ymOf(pages[pages.length - 1]?.day ?? null) ?? todayYm;
  const maxYm = monthIndex(lastYm) > monthIndex(todayYm) ? lastYm : todayYm;

  const [month, setMonth] = useState<YearMonth>(
    () => ymOf(currentDay) ?? todayYm,
  );

  useEffect(() => {
    if (visible) setMonth(ymOf(currentDay) ?? todayYm);
  }, [visible]);

  const byDay = useMemo(() => {
    const m = new Map<string, number[]>();
    pages.forEach((p, i) => {
      const list = m.get(p.day);
      if (list) list.push(i);
      else m.set(p.day, [i]);
    });
    return m;
  }, [pages]);

  const weeks = useMemo(() => monthMatrix(month.y, month.m), [month]);
  const prefix = dayKey(month.y, month.m, 1).slice(0, 8);
  const monthPages = useMemo(
    () =>
      pages
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => p.day.startsWith(prefix)),
    [pages, prefix],
  );
  const parkCount = new Set(monthPages.map(({ p }) => p.parkId)).size;
  const dayCount = new Set(monthPages.map(({ p }) => p.day)).size;

  const canPrev = monthIndex(month) > monthIndex(minYm);
  const canNext = monthIndex(month) < monthIndex(maxYm);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.topBar}>
          <Text style={styles.topTitle}>公園カレンダー</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="閉じる">
            <MaterialDesignIcons name="close" size={26} color={Colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.monthRow}>
            <Pressable
              onPress={() => canPrev && setMonth((m) => addMonths(m, -1))}
              disabled={!canPrev}
              hitSlop={10}
              accessibilityLabel="前の月"
            >
              <MaterialDesignIcons
                name="chevron-left"
                size={32}
                color={canPrev ? Colors.text : Colors.border}
              />
            </Pressable>
            <Text style={styles.monthText}>
              {month.y}年{month.m}月
            </Text>
            <Pressable
              onPress={() => canNext && setMonth((m) => addMonths(m, 1))}
              disabled={!canNext}
              hitSlop={10}
              accessibilityLabel="次の月"
            >
              <MaterialDesignIcons
                name="chevron-right"
                size={32}
                color={canNext ? Colors.text : Colors.border}
              />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEK_HEADER.map((w, i) => (
              <Text
                key={w}
                style={[
                  styles.weekHeader,
                  i === 0 && { color: Colors.prohibition },
                  i === 6 && { color: Colors.information },
                ]}
              >
                {w}
              </Text>
            ))}
          </View>
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((d, di) => {
                if (d === null) return <View key={di} style={styles.cell} />;
                const key = dayKey(month.y, month.m, d);
                const list = byDay.get(key);
                const has = !!list;
                const selected = key === currentDay;
                return (
                  <Pressable
                    key={di}
                    style={styles.cell}
                    disabled={!has}
                    onPress={() => list && onSelect(list[0])}
                    accessibilityLabel={
                      has
                        ? `${month.m}月${d}日 ${list!.length}か所の公園`
                        : `${month.m}月${d}日`
                    }
                  >
                    <View
                      style={[
                        styles.dayCircle,
                        has && styles.dayHas,
                        selected && styles.daySelected,
                        key === today && styles.dayToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          has && styles.dayTextHas,
                          selected && styles.dayTextSelected,
                        ]}
                      >
                        {d}
                      </Text>
                    </View>
                    {has ? (
                      <View style={styles.dots}>
                        {list!.slice(0, 3).map((i) => (
                          <View
                            key={i}
                            style={[
                              styles.dot,
                              selected && { backgroundColor: Colors.tint },
                            ]}
                          />
                        ))}
                      </View>
                    ) : (
                      <View style={styles.dots} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}

          <Text style={styles.summary}>
            {monthPages.length === 0
              ? "この月の記録はありません"
              : `${dayCount}日・${parkCount}か所の公園を訪れました`}
          </Text>

          {monthPages.map(({ p, i }) => (
            <Pressable
              key={p.key}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
              onPress={() => onSelect(i)}
            >
              <Text style={styles.itemDay}>{formatDayLabel(p.day)}</Text>
              <View style={styles.itemBody}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {p.name || "名前のない公園"}
                </Text>
                <Text style={styles.itemTime}>{formatTime(p.enteredAt)}〜</Text>
              </View>
              <MaterialDesignIcons
                name="chevron-right"
                size={22}
                color={Colors.mutedText}
              />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  topTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  scroll: {
    paddingHorizontal: 12,
    paddingBottom: 32,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  monthText: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  weekRow: {
    flexDirection: "row",
  },
  weekHeader: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    color: Colors.subText,
    paddingBottom: 6,
  },
  cell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  dayHas: {
    backgroundColor: "rgba(47, 149, 220, 0.15)",
  },
  daySelected: {
    backgroundColor: Colors.tint,
  },
  dayToday: {
    borderColor: Colors.tint,
  },
  dayText: {
    fontSize: 15,
    color: Colors.mutedText,
  },
  dayTextHas: {
    color: Colors.text,
    fontWeight: "bold",
  },
  dayTextSelected: {
    color: "#fff",
  },
  dots: {
    flexDirection: "row",
    gap: 3,
    height: 8,
    marginTop: 2,
    alignItems: "center",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#f39800",
  },
  summary: {
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 4,
    fontSize: 14,
    color: Colors.subText,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  pressed: {
    backgroundColor: Colors.surface,
  },
  itemDay: {
    width: 118,
    fontSize: 13,
    color: Colors.subText,
  },
  itemBody: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    color: Colors.text,
  },
  itemTime: {
    fontSize: 12,
    color: Colors.mutedText,
  },
});
