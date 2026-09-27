import { Text } from "@/components/Themed";
import { getCurrentLocation, reverseGeocode } from "@/lib/utility";
import { useCallback, useEffect, useState } from "react";
import { Button, StyleSheet, View } from "react-native";
import MapView, {
  LatLng,
  Marker,
  Polygon,
  PROVIDER_GOOGLE,
} from "react-native-maps";
type props = {
  onLocationDecided: (area: Area) => void;
};

export type Area = {
  geometry: LatLng[];
  name: string;
  address: string;
};

export async function MapSearchFromDB(latitude: number, longitude: number) {
  try{
    const fetchdate = await fetch(`http://10.0.2.2:3000/api/parks/search?lat=${latitude}&lng=${longitude}`);
    if (!fetchdate.ok){
      return null;
    }
    const parkDB = await fetchdate.json();
    return parkDB;
  }
  catch(error){
    console.error("データベースに見つかりません", error);
    return null;
  }
}

export default function Map({ onLocationDecided }: props) {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [address, setAddress] = useState<string>("");
  const [index, setIndex] = useState<number>(0);

  const getLocation = async () => {
    try {
      const location = await getCurrentLocation();
      setLocation(location);
    } catch (error) {
      // TODO: エラー処理を適切に行う
      console.error("位置情報の取得に失敗しました:", error);
    }
  };

  const getArea = async (latitude: number, longitude: number) => {
    try {
      const mapdate = await MapSearchFromDB(latitude, longitude);
      if (mapdate != null){
        const polygoncast = mapdate.area as unknown as [number, number][][];
        const pointlist = polygoncast[0] || [];
        const togeometry = pointlist.map((pointlist) => ({latitude: pointlist[1], longitude: pointlist[0]}));
        setAreas([{
          name: mapdate.name,
          address: mapdate.address,
          geometry: togeometry,
        }]);
        setAddress(mapdate.address);
        return;
      }
      const result = await reverseGeocode(latitude, longitude);
      const areas = result.elements.map((element) => ({
        geometry: element.geometry.map((point) => ({
          latitude: point.lat,
          longitude: point.lon,
        })),
        name: element.tags.name || element.tags["name:en"] || "",
        address: result.address,
      }));
      setAreas(areas);
    } catch (error) {
      console.error("エリア情報の取得に失敗しました:", error);
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    if (!location) return;

    getArea(location.latitude, location.longitude);
  }, [location]);

  const onPress = () => {
    console.log(areas);
    onLocationDecided(areas[index]);
  };

  // TODO: 自分でエリアを囲って決定できるようにする。
  // TODO: 公園の名前を変更できるようにする
  return (
    <View style={styles.container}>
      <Text>
        現在の位置:{" "}
        {location ? `${location.latitude}, ${location.longitude}` : "取得中..."}
      </Text>
      {areas.length > 0 && <Text>公園の名前: {areas[index].name}</Text>}
      <Text>住所: {address}</Text>
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
      <Button title="submit" onPress={onPress} />
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
