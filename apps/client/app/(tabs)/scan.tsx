import { Button, StyleSheet } from "react-native";

import EditScreenInfo from "@/components/EditScreenInfo";
import { Text, View } from "@/components/Themed";
import {
  CameraCapturedPicture,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { useState } from "react";
import Camera from "@/components/scan/camera";
import Map from "@/components/scan/map";

type ScanState = "camera" | "map" | "confirm";

export default function ScanTab() {
  const [scanState, setScanState] = useState<ScanState>("camera");
  const [photo, setPhoto] = useState<CameraCapturedPicture | null>(null);

  const onPictureTaken = (photo: CameraCapturedPicture) => {
    setPhoto(photo);
    setScanState("map");
  };

  const onLocationDecided = () => {
    setScanState("confirm");
  };

  return (
    <View style={styles.container}>
      {scanState === "camera" && <Camera onPictureTaken={onPictureTaken} />}
      {scanState === "map" && <Map onLocationDecided={onLocationDecided} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
