import {
  CameraCapturedPicture,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { useState } from "react";
import { View, Pressable, StyleSheet,Image } from "react-native";

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
      <Image style={styles.frame1} source={require("../../assets/images/frame.png")}/>
      <Image style={styles.frame2} source={require("../../assets/images/frame.png")}/>
      <Image style={styles.frame3} source={require("../../assets/images/frame.png")}/>
      <Image style={styles.frame4} source={require("../../assets/images/frame.png")}/>
      <View style={[styles.screen_base,styles.shape1,styles.pos1]}></View>
      <View style={[styles.screen_base,styles.shape1,styles.pos2]}></View>
      <View style={[styles.screen_base,styles.shape2,styles.pos3]}></View>
      <View style={[styles.screen_base,styles.shape2,styles.pos4]}></View>
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
  frame1:{
    position:"absolute",
    left:35,
    top:80,
  },
  frame2:{
    position:"absolute",
    right:35,
    top:80,
    transform:[{rotate:"90deg"}],
  },
  frame3:{
    position:"absolute",
    right:35,
    bottom:80,
    transform:[{rotate:"180deg"}],
  },
  frame4:{
    position:"absolute",
    left:35,
    bottom:80,
    transform:[{rotate:"270deg"}],
  },
  screen_base:{
    position:"absolute",
    opacity:0.3,
    backgroundColor:"black",
  },
  shape1:{
    width:"100%",
    height:80,
  },
  shape2:{
    width:35,
    height:"auto",
    top:80,
    bottom:80,
  },
  pos1:{
    top:0,
  },
  pos2:{
    bottom:0,
  },
  pos3:{
    left:0,
  },
  pos4:{
    right:0,
  },
});
