import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import * as ParkTracker from "@/modules/park-tracker";
import Colors from "@/constants/Colors";
import { buildPages, formatDayLabel, type DiaryPage } from "@/lib/diary";
import {
  getPhotoAccess,
  requestPhotoAccess,
  reselectPhotos,
  type Photo,
  type PhotoAccess,
} from "@/lib/photos";
import { DiaryPageView, type MapModalData } from "@/components/diary/DiaryPage";
import { CalendarModal } from "@/components/diary/CalendarModal";
import { MapModal, PhotoViewer } from "@/components/diary/Viewers";

type ListState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; pages: DiaryPage[] };

const clamp = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);

export default function DiaryTab() {
  if (Platform.OS !== "android") {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>公園日記は Android 版でのみ使えます</Text>
      </View>
    );
  }
  return <Diary />;
}

function Diary() {
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [photoAccess, setPhotoAccess] = useState<PhotoAccess | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [mapModal, setMapModal] = useState<MapModalData | null>(null);
  const [viewer, setViewer] = useState<{
    photos: Photo[];
    index: number;
  } | null>(null);

  const listRef = useRef<FlatList<DiaryPage>>(null);
  const scrolledIndexRef = useRef(0);
  const pagesRef = useRef<DiaryPage[] | null>(null);
  const indexRef = useRef(0);
  indexRef.current = index;

  const pages = list.status === "loaded" ? list.pages : null;
  pagesRef.current = pages;

  const loadSeq = useRef(0);
  const loadPages = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const visits = await ParkTracker.getVisits(0);
      if (seq !== loadSeq.current) return;
      const next = buildPages(visits);
      const prev = pagesRef.current;
      const prevIndex = indexRef.current;
      let nextIndex: number;
      if (!prev || prev.length === 0) {
        nextIndex = next.length - 1;
      } else {
        const wasLatest = prevIndex >= prev.length - 1;
        const same = next.findIndex((p) => p.key === prev[prevIndex]?.key);
        nextIndex = wasLatest || same < 0 ? next.length - 1 : same;
      }
      setList({ status: "loaded", pages: next });
      setIndex(clamp(nextIndex, 0, Math.max(0, next.length - 1)));
    } catch (e) {
      if (seq !== loadSeq.current) return;
      const message = e instanceof Error ? e.message : String(e);
      setList((prev) =>
        prev.status === "loaded" ? prev : { status: "error", message },
      );
    }
  }, []);

  const refreshPhotoAccess = useCallback(async () => {
    setPhotoAccess(await getPhotoAccess());
  }, []);

  const reloadAll = useCallback(() => {
    void loadPages();
    void refreshPhotoAccess();
    setReloadToken((t) => t + 1);
  }, [loadPages, refreshPhotoAccess]);

  useFocusEffect(
    useCallback(() => {
      reloadAll();
      const appState = AppState.addEventListener("change", (s) => {
        if (s === "active") reloadAll();
      });
      const enter = ParkTracker.addListener("ParkTrackerEnter", () =>
        reloadAll(),
      );
      return () => {
        appState.remove();
        enter.remove();
      };
    }, [reloadAll]),
  );

  useEffect(() => {
    if (!pages || pages.length === 0 || width <= 0) return;
    if (scrolledIndexRef.current !== index) {
      scrolledIndexRef.current = index;
      listRef.current?.scrollToOffset({
        offset: index * width,
        animated: false,
      });
    }
  }, [pages, index, width]);

  const goTo = useCallback(
    (i: number, animated: boolean) => {
      const ps = pagesRef.current;
      if (!ps || ps.length === 0 || width <= 0) return;
      const t = clamp(i, 0, ps.length - 1);
      setIndex(t);
      if (scrolledIndexRef.current !== t) {
        scrolledIndexRef.current = t;
        listRef.current?.scrollToOffset({ offset: t * width, animated });
      }
    },
    [width],
  );

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const ps = pagesRef.current;
      if (!ps || ps.length === 0 || width <= 0) return;
      const i = clamp(
        Math.round(e.nativeEvent.contentOffset.x / width),
        0,
        ps.length - 1,
      );
      scrolledIndexRef.current = i;
      setIndex(i);
    },
    [width],
  );

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setWidth((prev) => (prev === w ? prev : w));
  }, []);

  const onRequestPhotoAccess = useCallback(async () => {
    setPhotoAccess(await requestPhotoAccess());
    setReloadToken((t) => t + 1);
  }, []);

  const onReselectPhotos = useCallback(async () => {
    await reselectPhotos();
    await refreshPhotoAccess();
    setReloadToken((t) => t + 1);
  }, [refreshPhotoAccess]);

  const onOpenPhoto = useCallback((photos: Photo[], i: number) => {
    setViewer({ photos, index: i });
  }, []);

  const renderItem: ListRenderItem<DiaryPage> = useCallback(
    ({ item, index: i }) => (
      <DiaryPageView
        page={item}
        width={width}
        active={Math.abs(i - index) <= 1}
        reloadToken={reloadToken}
        photoAccess={photoAccess}
        onRequestPhotoAccess={onRequestPhotoAccess}
        onReselectPhotos={onReselectPhotos}
        onOpenMap={setMapModal}
        onOpenPhoto={onOpenPhoto}
      />
    ),
    [
      width,
      index,
      reloadToken,
      photoAccess,
      onRequestPhotoAccess,
      onReselectPhotos,
      onOpenPhoto,
    ],
  );

  if (list.status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.tint} />
      </View>
    );
  }
  if (list.status === "error") {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>日記を読み込めませんでした</Text>
        <Text style={styles.small}>{list.message}</Text>
        <Pressable style={styles.retry} onPress={reloadAll}>
          <Text style={styles.retryText}>再読み込み</Text>
        </Pressable>
      </View>
    );
  }
  if (list.pages.length === 0) {
    return (
      <View style={styles.center}>
        <MaterialDesignIcons
          name="book-open-page-variant-outline"
          size={48}
          color={Colors.mutedText}
        />
        <Text style={styles.emptyTitle}>まだ日記がありません</Text>
        <Text style={styles.emptyText}>
          Rules
          タブの「外出する」をオンにして公園を訪れると、歩いた道やカメラに映ったものがここに記録されます。
        </Text>
      </View>
    );
  }

  const all = list.pages;
  const i = clamp(index, 0, all.length - 1);
  const current = all[i];
  const sameDay = all.filter((p) => p.day === current.day);
  const posInDay = sameDay.findIndex((p) => p.key === current.key);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => goTo(i - 1, true)}
          disabled={i === 0}
          hitSlop={10}
          accessibilityLabel="前の日記"
        >
          <MaterialDesignIcons
            name="chevron-left"
            size={34}
            color={i === 0 ? Colors.border : Colors.text}
          />
        </Pressable>
        <Pressable
          style={styles.headerCenter}
          onPress={() => setCalendarOpen(true)}
          accessibilityLabel="カレンダーを開く"
        >
          <View style={styles.dateRow}>
            <MaterialDesignIcons
              name="calendar-month-outline"
              size={20}
              color={Colors.tint}
            />
            <Text style={styles.dateText}>{formatDayLabel(current.day)}</Text>
          </View>
          <Text style={styles.subText}>
            {sameDay.length > 1
              ? `この日の公園 ${posInDay + 1} / ${sameDay.length}`
              : `${i + 1} / ${all.length} 件目の記録`}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => goTo(i + 1, true)}
          disabled={i === all.length - 1}
          hitSlop={10}
          accessibilityLabel="次の日記"
        >
          <MaterialDesignIcons
            name="chevron-right"
            size={34}
            color={i === all.length - 1 ? Colors.border : Colors.text}
          />
        </Pressable>
      </View>

      <View style={styles.pager} onLayout={onLayout}>
        {width > 0 ? (
          <FlatList
            key={`pager-${width}`}
            ref={listRef}
            data={all}
            keyExtractor={(p) => p.key}
            renderItem={renderItem}
            extraData={renderItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={i}
            getItemLayout={(_, n) => ({
              length: width,
              offset: width * n,
              index: n,
            })}
            onMomentumScrollEnd={onMomentumScrollEnd}
            windowSize={3}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            removeClippedSubviews={false}
          />
        ) : null}
      </View>

      <CalendarModal
        visible={calendarOpen}
        pages={all}
        currentDay={current.day}
        onSelect={(n) => {
          setCalendarOpen(false);
          goTo(n, false);
        }}
        onClose={() => setCalendarOpen(false)}
      />
      <MapModal data={mapModal} onClose={() => setMapModal(null)} />
      <PhotoViewer
        photos={viewer?.photos ?? null}
        index={viewer?.index ?? 0}
        onClose={() => setViewer(null)}
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
    padding: 24,
    gap: 10,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  subText: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.subText,
  },
  pager: {
    flex: 1,
  },
  muted: {
    fontSize: 15,
    color: Colors.mutedText,
    textAlign: "center",
  },
  small: {
    fontSize: 12,
    color: Colors.mutedText,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.subText,
    textAlign: "center",
    lineHeight: 21,
  },
  retry: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.tint,
  },
  retryText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
