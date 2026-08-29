import { Text } from "@/components/Themed";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Button, StyleSheet, View } from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
type props = {
  onLocationDecided: () => void;
};

export default function Map({ onLocationDecided }: props) {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.log("位置情報へのアクセスが許可されていない");
      return;
    }
    const location = await Location.getCurrentPositionAsync({});
    setLocation(location);
  };

  useEffect(() => {
    getLocation();
  }, []);

  return (
    <View style={styles.container}>
      <Text>
        現在の位置:{" "}
        {location
          ? `${location.coords.latitude}, ${location.coords.longitude}`
          : "取得中..."}
      </Text>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location?.coords.latitude || 35.6895,
          longitude: location?.coords.longitude || 139.6917,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        provider={PROVIDER_GOOGLE}
      ></MapView>
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
