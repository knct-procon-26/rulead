import {
  CameraCapturedPicture,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { useState } from "react";
import { View, Pressable, StyleSheet, Image } from "react-native";

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
      <Image
        style={styles.frame1}
        source={require("../../assets/images/frame.png")}
      />
      <Image
        style={styles.frame2}
        source={require("../../assets/images/frame.png")}
      />
      <Image
        style={styles.frame3}
        source={require("../../assets/images/frame.png")}
      />
      <Image
        style={styles.frame4}
        source={require("../../assets/images/frame.png")}
      />
      <View style={[styles.screen_base, styles.topScreen]}></View>
      <View style={[styles.screen_base, styles.bottomScreen]}></View>
      <View style={[styles.screen_base, styles.leftScreen]}></View>
      <View style={[styles.screen_base, styles.rightScreen]}></View>
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
  frame1: {
    position: "absolute",
    left: 35,
    top: 40,
  },
  frame2: {
    position: "absolute",
    right: 35,
    top: 40,
    transform: [{ rotate: "90deg" }],
  },
  frame3: {
    position: "absolute",
    right: 35,
    bottom: 100,
    transform: [{ rotate: "180deg" }],
  },
  frame4: {
    position: "absolute",
    left: 35,
    bottom: 100,
    transform: [{ rotate: "270deg" }],
  },
  screen_base: {
    position: "absolute",
    opacity: 0.3,
    backgroundColor: "black",
  },
  topScreen: {
    top: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  bottomScreen: {
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  leftScreen: {
    top: 40,
    bottom: 100,
    left: 0,
    width: 35,
  },
  rightScreen: {
    top: 40,
    bottom: 100,
    right: 0,
    width: 35,
  },
});
