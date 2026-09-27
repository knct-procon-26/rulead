import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

import Colors from "@/constants/Colors";
import { formatTime } from "@/lib/diary";
import { useT } from "@/lib/i18n";
import type { Photo } from "@/lib/photos";
import { DiaryMap, PARK_STROKE, TRACK_COLOR } from "./DiaryMap";
import type { MapModalData } from "./DiaryPage";

export function MapModal({
  data,
  onClose,
}: {
  data: MapModalData | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const t = useT();
  return (
    <Modal
      visible={data !== null}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {data ? (
        <View style={styles.mapContainer}>
          <DiaryMap
            region={data.region}
            polygons={data.polygons}
            stays={data.stays}
            interactive
          />
          <View style={[styles.mapTop, { top: insets.top + 8 }]}>
            <Text style={styles.mapTitle} numberOfLines={1}>
              {data.title}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityLabel={t.common.close}
              style={styles.roundButton}
            >
              <MaterialDesignIcons name="close" size={24} color={Colors.text} />
            </Pressable>
          </View>
          <View style={[styles.mapLegend, { bottom: insets.bottom + 16 }]}>
            <View style={[styles.legendSwatch, { borderColor: PARK_STROKE }]} />
            <Text style={styles.legendText}>{t.diary.legendPark}</Text>
            <View
              style={[styles.legendLine, { backgroundColor: TRACK_COLOR }]}
            />
            <Text style={styles.legendText}>{t.diary.legendTrack}</Text>
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

export function PhotoViewer({
  photos,
  index,
  onClose,
}: {
  photos: Photo[] | null;
  index: number;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const t = useT();
  const count = photos?.length ?? 0;
  const start = count === 0 ? 0 : Math.min(Math.max(index, 0), count - 1);
  const [current, setCurrent] = useState(start);

  useEffect(() => {
    setCurrent(start);
  }, [photos, start]);

  const onEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (width <= 0 || count === 0) return;
      const i = Math.round(e.nativeEvent.contentOffset.x / width);
      setCurrent(Math.min(Math.max(i, 0), count - 1));
    },
    [width, count],
  );

  const photo =
    photos && count > 0 ? photos[Math.min(current, count - 1)] : null;

  return (
    <Modal
      visible={photos !== null}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.photoContainer}>
        {photos && count > 0 ? (
          <FlatList
            key={`${photos[0].id}:${count}:${start}:${width}`}
            data={photos}
            keyExtractor={(p) => p.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={start}
            getItemLayout={(_, i) => ({
              length: width,
              offset: width * i,
              index: i,
            })}
            windowSize={3}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            onMomentumScrollEnd={onEnd}
            renderItem={({ item }) => (
              <View style={{ width, height }}>
                <Image
                  source={{ uri: item.uri }}
                  style={styles.photo}
                  resizeMode="contain"
                />
              </View>
            )}
          />
        ) : null}
        <View style={[styles.photoTop, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.photoInfo}>
            {photo
              ? `${Math.min(current, count - 1) + 1} / ${count}　${formatTime(photo.takenAt)}`
              : ""}
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityLabel={t.common.close}
          >
            <MaterialDesignIcons name="close" size={28} color="#fff" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapTop: {
    position: "absolute",
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mapTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.text,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    overflow: "hidden",
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  mapLegend: {
    position: "absolute",
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
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
  photoContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  photoInfo: {
    color: "#fff",
    fontSize: 15,
  },
});
