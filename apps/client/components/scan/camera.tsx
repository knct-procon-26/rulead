import {
  CameraCapturedPicture,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";

type props = {
  onPictureTaken: (photo: CameraCapturedPicture) => void;
};

export default function Camera({ onPictureTaken }: props) {
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
      const photo = await camera.takePictureAsync({
        base64: true,
      });
      onPictureTaken(photo);
    }
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        ref={(ref) => setCamera(ref)}
      ></CameraView>
      <Pressable onPress={takePicture} style={styles.button}></Pressable>
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
  button: {
    position: "absolute",
    bottom: 10,
    left: "50%",
    transform: [{ translateX: -40 }],
    width: 80,
    height: 80,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderColor: "rgba(0, 0, 0, 0.5)",
    borderWidth: 5,
    borderRadius: 40,
  },
});
