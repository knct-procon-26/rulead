import { Text } from "@/components/Themed";
import { getCurrentLocation, reverseGeocode } from "@/lib/utility";
import {router} from "expo-router";
import { useEffect, useState } from "react";
import { Button, StyleSheet, View } from "react-native";
import MapView, {
  LatLng,
  Marker,
  Polygon,
  PROVIDER_GOOGLE,
} from "react-native-maps";
type props = {
  onLocationDecided: () => void;
};

type Area = {
  geometry: LatLng[];
  name: string;
};

export default function Map({ onLocationDecided }: props) {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [index, setIndex] = useState<number>(0);

  const getLocation = async () => {
    try {
      const location = await getCurrentLocation();
      setLocation(location);
    } catch (error) {
      // TODO: エラー処理を適切に行う
      alert("位置情報の取得に失敗しました。");
      router.replace("/");
    }
  };

  const getArea = async (latitude: number, longitude: number) => {
    try {
      const result = await reverseGeocode(latitude, longitude);
      const areas = result.elements.map((element) => ({
        geometry: element.geometry.map((point) => ({
          latitude: point.lat,
          longitude: point.lon,
        })),
        name: element.tags.name || element.tags["name:en"] || "",
      }));
      setAreas(areas);
    } catch (error) {
        alert("エリア情報の取得に失敗しました。");
        router.replace("/");
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    if (!location) return;

    getArea(location.latitude, location.longitude);
  }, [location]);

  return (
    <View style={styles.container}>
      <Text>
        現在の位置:{" "}
        {location ? `${location.latitude}, ${location.longitude}` : "取得中..."}
      </Text>
      {areas.length > 0 && <Text>公園の名前: {areas[index].name}</Text>}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location?.latitude || 33.5788760503074,
          longitude: location?.longitude || 130.39915522048497,
          latitudeDelta: 0.001,
          longitudeDelta: 0.001,
        }}
        provider={PROVIDER_GOOGLE}
      >
        <Marker
          coordinate={{
            latitude: location?.latitude || 33.5788760503074,
            longitude: location?.longitude || 130.39915522048497,
          }}
        />
        {areas.length > 0 && (
          <Polygon
            coordinates={areas[index].geometry}
            strokeColor="rgba(9, 255, 0, 0.5)"
            fillColor="rgba(0, 255, 42, 0.2)"
            strokeWidth={2}
          />
        )}
      </MapView>
      <Button
        title="See Others"
        onPress={() => setIndex((prev) => (prev + 1) % areas.length)}
      />
      <Button title="submit" onPress={onLocationDecided} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});
