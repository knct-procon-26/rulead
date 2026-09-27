import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import * as ParkTracker from "@/modules/park-tracker";
import type { ParkPolygon } from "@/modules/park-tracker";
import Colors from "@/constants/Colors";
import {
  MLKIT_LABELS,
  labelText,
  type LabelCategory,
} from "@/constants/MlkitLabels";
import { getT, useT, useUiLocale } from "@/lib/i18n";
import { ParkHeader } from "@/components/rules/ParkHeader";
import { DiaryMap, PARK_STROKE, TRACK_COLOR } from "./DiaryMap";
import {
  buildStays,
  dayRange,
  formatDuration,
  formatTime,
  photoWindows,
  rankSightings,
  regionFor,
  stayPeriod,
  thinPoints,
  type DiaryPage as Page,
  type RankedSighting,
  type Region,
  type Stay,
} from "@/lib/diary";
import { findPhotos, type Photo, type PhotoAccess } from "@/lib/photos";

type Glyph = ComponentProps<typeof MaterialDesignIcons>["name"];

const MAX_TRACK_POINTS = 1500;

const RANK_LIMIT = 5;

const MAX_THUMBS = 30;
const MAP_HEIGHT = 240;
const H_PAD = 16;
const GRID_GAP = 4;

export type MapModalData = {
  title: string;
  region: Region;
  polygons: ParkPolygon[];
  stays: Stay[];
};

type PageData = {
  name: string;
  address: string;
  polygons: ParkPolygon[];

  stays: Stay[];

  mapStays: Stay[];
  region: Region | null;
  period: { start: number; end: number | null; total: number };
  ranking: RankedSighting[];
};

async function loadPageData(page: Page): Promise<PageData> {
  const range = dayRange(page.day);
  if (!range) throw new Error(getT().diary.invalidDate);
  const [track, sightings, visited, details] = await Promise.all([
    ParkTracker.getTrack(range.start, range.end),
    ParkTracker.getSightings(range.start, range.end),
    ParkTracker.getVisitedPark(page.parkId).catch(() => null),
    ParkTracker.getParkDetails(page.parkId).catch(() => null),
  ]);
  const stays = buildStays(track, page.parkId);
  const total = stays.reduce((n, s) => n + s.points.length, 0);
  const mapStays =
    total <= MAX_TRACK_POINTS
      ? stays
      : stays.map((s) => ({
          ...s,
          points: thinPoints(
            s.points,
            Math.max(
              2,
              Math.round((MAX_TRACK_POINTS * s.points.length) / total),
            ),
          ),
        }));
  const polygons = visited?.polygons ?? [];
  return {
    name: page.name || visited?.name || details?.name || "",
    address: visited?.address || details?.address || "",
    polygons,
    stays,
    mapStays,
    region: regionFor(polygons, mapStays),
    period: stayPeriod(stays, page.enteredAt),
    ranking: rankSightings(sightings, page.parkId, page.day, RANK_LIMIT),
  };
}

const CATEGORY_ICON: Record<LabelCategory, Glyph> = {
  PEOPLE: "account",
  BODY: "hand-back-right",
  CLOTHING: "tshirt-crew",
  ANIMAL: "paw",
  PLANT: "flower",
  NATURE: "pine-tree",
  WEATHER: "weather-partly-cloudy",
  SPACE: "rocket-launch",
  FOOD: "food-apple",
  VEHICLE: "car",
  PLACE: "office-building",
  SPORTS: "soccer",
  EVENT: "party-popper",
  ARTS: "palette",
  OBJECT: "cube-outline",
  FURNITURE: "sofa",
  ELECTRONICS: "cellphone",
  MATERIAL: "texture",
  ACTION: "run",
  CONCEPT: "lightbulb-outline",
  IMAGE: "image-outline",
  CHARACTER: "emoticon-outline",
};

const MEDAL = ["#d4a017", "#9e9e9e", "#b87333"] as const;

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; data: PageData }
  | { status: "error"; message: string };

type PhotoState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; photos: Photo[] }
  | { status: "error" };

type Props = {
  page: Page;
  width: number;

  active: boolean;

  reloadToken: number;
  photoAccess: PhotoAccess | null;
  onRequestPhotoAccess: () => void;
  onReselectPhotos: () => void;
  onOpenMap: (data: MapModalData) => void;
  onOpenPhoto: (photos: Photo[], index: number) => void;
};

export const DiaryPageView = memo(function DiaryPageView({
  page,
  width,
  active,
  reloadToken,
  photoAccess,
  onRequestPhotoAccess,
  onReselectPhotos,
  onOpenMap,
  onOpenPhoto,
}: Props) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const t = useT();
  const locale = useUiLocale();
  const loadedToken = useRef<number | null>(null);

  const { key, day, parkId, enteredAt, name } = page;

  useEffect(() => {
    if (!active || loadedToken.current === reloadToken) return;
    let cancelled = false;
    loadPageData({ key, day, parkId, enteredAt, name }).then(
      (data) => {
        if (cancelled) return;
        loadedToken.current = reloadToken;
        setState({ status: "loaded", data });
      },
      (e: unknown) => {
        if (cancelled) return;

        setState((prev) =>
          prev.status === "loaded"
            ? prev
            : {
                status: "error",
                message: e instanceof Error ? e.message : String(e),
              },
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [active, reloadToken, key, day, parkId, enteredAt, name]);

  const data = state.status === "loaded" ? state.data : null;

  const windows = useMemo(() => (data ? photoWindows(data.stays) : []), [data]);
  const windowsKey = windows.map((w) => `${w.start}-${w.end}`).join(",");
  const canReadPhotos = photoAccess === "granted" || photoAccess === "limited";
  const [photoState, setPhotoState] = useState<PhotoState>({ status: "idle" });

  useEffect(() => {
    if (!active || !data || !canReadPhotos) return;
    if (windows.length === 0) {
      setPhotoState({ status: "loaded", photos: [] });
      return;
    }
    let cancelled = false;
    setPhotoState((prev) =>
      prev.status === "loaded" ? prev : { status: "loading" },
    );
    findPhotos(windows).then(
      (photos) => {
        if (!cancelled) setPhotoState({ status: "loaded", photos });
      },
      () => {
        if (!cancelled) setPhotoState({ status: "error" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [active, canReadPhotos, windowsKey, reloadToken, data !== null]);

  const contentWidth = Math.max(0, width - H_PAD * 2);

  if (state.status === "loading") {
    return (
      <View style={[styles.center, { width }]}>
        <ActivityIndicator color={Colors.tint} />
      </View>
    );
  }
  if (state.status === "error") {
    return (
      <View style={[styles.center, { width }]}>
        <Text style={styles.muted}>{t.diary.loadFailed}</Text>
        <Text style={styles.small}>{state.message}</Text>
      </View>
    );
  }

  const d = state.data;
  const title = d.name || t.common.unnamedPark;

  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <ParkHeader name={d.name} address={d.address} />

      <View style={styles.timeRow}>
        <MaterialDesignIcons
          name="clock-outline"
          size={18}
          color={Colors.subText}
        />
        <Text style={styles.timeText}>
          {d.period.end !== null && d.period.end > d.period.start
            ? `${formatTime(d.period.start)} – ${formatTime(d.period.end)}`
            : t.diary.visitedAt(formatTime(d.period.start))}
          {d.period.total > 0
            ? t.diary.stay(formatDuration(t, d.period.total), d.stays.length)
            : ""}
        </Text>
      </View>

      {/* 地図 */}
      <View style={[styles.mapBox, { height: MAP_HEIGHT }]}>
        {d.region ? (
          active ? (
            <>
              <DiaryMap
                key={`${key}:${d.region.latitude}:${d.region.longitude}:${d.region.latitudeDelta}`}
                region={d.region}
                polygons={d.polygons}
                stays={d.mapStays}
                interactive={false}
                onPress={() =>
                  d.region &&
                  onOpenMap({
                    title,
                    region: d.region,
                    polygons: d.polygons,
                    stays: d.mapStays,
                  })
                }
              />
              <Pressable
                style={styles.expand}
                hitSlop={8}
                accessibilityLabel={t.diary.expandMap}
                onPress={() =>
                  d.region &&
                  onOpenMap({
                    title,
                    region: d.region,
                    polygons: d.polygons,
                    stays: d.mapStays,
                  })
                }
              >
                <MaterialDesignIcons
                  name="arrow-expand"
                  size={20}
                  color={Colors.text}
                />
              </Pressable>
            </>
          ) : null
        ) : (
          <View style={styles.mapEmpty}>
            <MaterialDesignIcons
              name="map-marker-question-outline"
              size={32}
              color={Colors.mutedText}
            />
            <Text style={styles.muted}>{t.diary.noMapData}</Text>
          </View>
        )}
      </View>
      <View style={styles.legend}>
        <View style={[styles.legendSwatch, { borderColor: PARK_STROKE }]} />
        <Text style={styles.legendText}>{t.diary.legendPark}</Text>
        <View style={[styles.legendLine, { backgroundColor: TRACK_COLOR }]} />
        <Text style={styles.legendText}>{t.diary.legendTrack}</Text>
      </View>

      {/* よく見たもの */}
      <Text style={styles.sectionTitle}>{t.diary.seenTitle}</Text>
      {d.ranking.length === 0 ? (
        <Text style={styles.muted}>{t.diary.seenNone}</Text>
      ) : (
        d.ranking.map((r, i) => {
          const info =
            r.labelIndex >= 0 ? MLKIT_LABELS[r.labelIndex] : undefined;
          const primary = info ? labelText(info, locale) : r.label;
          const top = d.ranking[0].count;
          return (
            <View key={r.key} style={styles.rankRow}>
              <View
                style={[
                  styles.rankBadge,
                  {
                    backgroundColor:
                      i < MEDAL.length ? MEDAL[i] : Colors.border,
                  },
                ]}
              >
                <Text style={styles.rankNum}>{i + 1}</Text>
              </View>
              <MaterialDesignIcons
                name={info ? CATEGORY_ICON[info.category] : "eye-outline"}
                size={24}
                color={Colors.subText}
                style={styles.rankIcon}
              />
              <View style={styles.rankBody}>
                <View style={styles.rankLine}>
                  <Text style={styles.rankLabel} numberOfLines={1}>
                    {primary}
                  </Text>
                  <Text style={styles.rankCount}>{t.diary.times(r.count)}</Text>
                </View>
                {info && info.en !== primary ? (
                  <Text style={styles.small} numberOfLines={1}>
                    {info.en}
                  </Text>
                ) : null}
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      { width: `${Math.max(4, (r.count / top) * 100)}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })
      )}

      {/* 写真 */}
      <Text style={styles.sectionTitle}>{t.diary.photosTitle}</Text>
      <PhotoSection
        access={photoAccess}
        state={photoState}
        hasStay={d.stays.length > 0}
        contentWidth={contentWidth}
        onRequestAccess={onRequestPhotoAccess}
        onReselect={onReselectPhotos}
        onOpen={onOpenPhoto}
      />
    </ScrollView>
  );
});

function PhotoSection({
  access,
  state,
  hasStay,
  contentWidth,
  onRequestAccess,
  onReselect,
  onOpen,
}: {
  access: PhotoAccess | null;
  state: PhotoState;
  hasStay: boolean;
  contentWidth: number;
  onRequestAccess: () => void;
  onReselect: () => void;
  onOpen: (photos: Photo[], index: number) => void;
}) {
  const t = useT();
  if (access === null) return <ActivityIndicator color={Colors.tint} />;
  if (access === "unavailable") {
    return (
      <Text style={styles.muted}>{t.diary.photosUnavailable}</Text>
    );
  }
  if (
    access === "undetermined" ||
    access === "denied" ||
    access === "blocked"
  ) {
    return (
      <View style={styles.permBox}>
        <Text style={styles.permText}>{t.diary.photosExplain}</Text>
        <Pressable
          style={styles.button}
          onPress={
            access === "blocked"
              ? () => void Linking.openSettings()
              : onRequestAccess
          }
        >
          <Text style={styles.buttonText}>
            {access === "blocked"
              ? t.diary.photosAllowInSettings
              : t.diary.photosAllow}
          </Text>
        </Pressable>
      </View>
    );
  }
  if (!hasStay) {
    return (
      <Text style={styles.muted}>{t.diary.photosNoStay}</Text>
    );
  }
  if (state.status === "idle" || state.status === "loading") {
    return <ActivityIndicator color={Colors.tint} />;
  }
  if (state.status === "error") {
    return <Text style={styles.muted}>{t.diary.photosLoadFailed}</Text>;
  }

  const photos = state.photos;
  const size = Math.floor((contentWidth - GRID_GAP * 2) / 3);
  const shown = photos.slice(0, MAX_THUMBS);
  const rest = photos.length - shown.length;

  return (
    <View>
      {access === "limited" ? (
        <View style={styles.limitedRow}>
          <Text style={[styles.small, styles.flex]}>
            {t.diary.photosLimited}
          </Text>
          <Pressable onPress={onReselect} hitSlop={8}>
            <Text style={styles.link}>{t.diary.photosReselect}</Text>
          </Pressable>
        </View>
      ) : null}
      {photos.length === 0 ? (
        <Text style={styles.muted}>{t.diary.photosNone}</Text>
      ) : (
        <View style={[styles.grid, { gap: GRID_GAP }]}>
          {shown.map((p, i) => {
            const isLast = i === shown.length - 1 && rest > 0;
            return (
              <Pressable
                key={p.id}
                onPress={() => onOpen(photos, i)}
                style={{ width: size, height: size }}
                accessibilityLabel={t.diary.photoTakenAt(formatTime(p.takenAt))}
              >
                <Image
                  source={{ uri: p.uri }}
                  style={styles.thumb}
                  resizeMode="cover"
                  resizeMethod="resize"
                />
                {isLast ? (
                  <View style={styles.moreOverlay}>
                    <Text style={styles.moreText}>+{rest}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  content: {
    paddingHorizontal: H_PAD,
    paddingBottom: 32,
  },
  flex: { flex: 1 },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    marginBottom: 12,
  },
  timeText: {
    fontSize: 14,
    color: Colors.subText,
  },
  mapBox: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: Colors.surface,
  },
  mapEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  expand: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  legendSwatch: {
    width: 14,
    height: 10,
    borderWidth: 2,
    borderRadius: 2,
    backgroundColor: "rgba(243, 152, 0, 0.18)",
  },
  legendLine: {
    width: 16,
    height: 4,
    borderRadius: 2,
    marginLeft: 10,
  },
  legendText: {
    fontSize: 12,
    color: Colors.subText,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 10,
    fontSize: 17,
    fontWeight: "bold",
    color: Colors.text,
  },
  muted: {
    fontSize: 14,
    color: Colors.mutedText,
  },
  small: {
    fontSize: 12,
    color: Colors.mutedText,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  rankNum: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },
  rankIcon: {
    marginHorizontal: 10,
  },
  rankBody: {
    flex: 1,
  },
  rankLine: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  rankLabel: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  rankCount: {
    fontSize: 13,
    color: Colors.subText,
  },
  barTrack: {
    marginTop: 4,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surface,
    overflow: "hidden",
  },
  bar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.tint,
  },
  permBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    gap: 12,
  },
  permText: {
    fontSize: 14,
    color: Colors.subText,
    lineHeight: 20,
  },
  button: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.tint,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  limitedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  link: {
    fontSize: 13,
    color: Colors.tint,
    fontWeight: "bold",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  thumb: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
    backgroundColor: Colors.surface,
  },
  moreOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  moreText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
});
