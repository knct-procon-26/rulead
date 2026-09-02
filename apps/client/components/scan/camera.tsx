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
  button:{
   left:180,
   width:50,
   height:50,
   backgroundColor:"white",
   borderColor:"black",
   borderWidth:5,
   borderRadius:25,
  },
});
