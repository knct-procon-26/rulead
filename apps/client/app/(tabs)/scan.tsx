import { Button, StyleSheet } from "react-native";

import EditScreenInfo from "@/components/EditScreenInfo";
import { Text, View } from "@/components/Themed";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useState } from "react";

export default function TabTwoScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [camera, setCamera] = useState<CameraView | null>(null);

  if (!permission) {
    return <View></View>;
  }

  if (!permission.granted) {
    requestPermission();
    return <View></View>;
  }

  async function takePicture() {
    if (camera) {
      const photo = await camera.takePictureAsync();
    }
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        ref={(ref) => setCamera(ref)}
      ></CameraView>
      <Button onPress={takePicture} title="Scan"></Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
  },
});
