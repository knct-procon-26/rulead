import { memo } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import MapView, {
  Circle,
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";

import type { ParkPolygon } from "@/modules/park-tracker";
import type { Region, Stay } from "@/lib/diary";

export const PARK_STROKE = "#f39800";
const PARK_FILL = "rgba(243, 152, 0, 0.18)";
export const TRACK_COLOR = "#1a73e8";

type Props = {
  region: Region;
  polygons: ParkPolygon[];

  stays: Stay[];

  interactive: boolean;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

export const DiaryMap = memo(function DiaryMap({
  region,
  polygons,
  stays,
  interactive,
  style,
  onPress,
}: Props) {
  return (
    <MapView
      style={[styles.map, style]}
      provider={PROVIDER_GOOGLE}
      initialRegion={region}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      rotateEnabled={interactive}
      pitchEnabled={interactive}
      toolbarEnabled={false}
      showsPointsOfInterests={false}
      showsBuildings={false}
      showsCompass={interactive}
      onPress={onPress}
    >
      {polygons.map((p, i) => (
        <Polygon
          key={`park-${i}`}
          coordinates={p.outer}
          holes={p.holes.length > 0 ? p.holes : undefined}
          strokeColor={PARK_STROKE}
          fillColor={PARK_FILL}
          strokeWidth={3}
        />
      ))}
      {stays.map((s, i) =>
        s.points.length >= 2 ? (
          <Polyline
            key={`track-${i}`}
            coordinates={s.points}
            strokeColor={TRACK_COLOR}
            strokeWidth={4}
            lineJoin="round"
            lineCap="round"
          />
        ) : s.points.length === 1 ? (
          <Circle
            key={`track-${i}`}
            center={s.points[0]}
            radius={5}
            strokeColor={TRACK_COLOR}
            fillColor={TRACK_COLOR}
            strokeWidth={1}
          />
        ) : null,
      )}
    </MapView>
  );
});

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
