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
      <View style={styles.frame1}></View>
      <View style={styles.frame2}></View>
      <View style={styles.frame3}></View>
      <View style={styles.frame4}></View>
      <View style={styles.frame5}></View>
      <View style={styles.frame6}></View>
      <View style={styles.frame7}></View>
      <View style={styles.frame8}></View>
      <View style={styles.screen1}></View>
      <View style={styles.screen2}></View>
      <View style={styles.screen3}></View>
      <View style={styles.screen4}></View>
      <Pressable onPress={takePicture}  style={styles.btn}></Pressable>
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
  btn:{
    position:"absolute",
    backgroundColor:"white",
    left:180,
    bottom:10,
    width:60,
    height:60,
    borderWidth:4,
    borderColor:"black",
    borderRadius:30,
  },
  screen1:{
    position:"absolute",
    top:0,
    left:0,
    width:"100%",
    height:80,
    opacity:0.3,
    backgroundColor:"black",
  },
  screen2:{
    position:"absolute",
    top:80,
    left:0,
    width:35,
    height:"100%",
    opacity:0.3,
    backgroundColor:"black",
  },
  screen3:{
    position:"absolute",
    bottom:0,
    left:35,
    right:35,
    width:"auto",
    height:80,
    opacity:0.3,
    backgroundColor:"black",
  },
  screen4:{
    position:"absolute",
    top:80,
    bottom:0,
    right:0,
    width:35,
    height:"auto",
    opacity:0.3,
    backgroundColor:"black",
  },
  frame1:{
    position:"absolute",
    width:10,
    height:60,
    backgroundColor:"black",
    top:80,
    left:35,
    borderWidth:1,
    borderColor:"white",
  },
  frame2:{
    position:"absolute",
    width:60,
    height:10,
    backgroundColor:"black",
    top:80,
    left:35,
    borderWidth:1,
    borderColor:"white",
  },
  frame3:{
    position:"absolute",
    width:10,
    height:60,
    backgroundColor:"black",
    top:80,
    right:35,
    borderWidth:1,
    borderColor:"white",
  },
  frame4:{
    position:"absolute",
    width:60,
    height:10,
    backgroundColor:"black",
    top:80,
    right:35,
    borderWidth:1,
    borderColor:"white",
  },
  frame5:{
    position:"absolute",
    width:10,
    height:60,
    backgroundColor:"black",
    bottom:80,
    right:35,
    borderWidth:1,
    borderColor:"white",
  },
  frame6:{
    position:"absolute",
    width:60,
    height:10,
    backgroundColor:"black",
    bottom:80,
    right:35,
    borderWidth:1,
    borderColor:"white",
  },
  frame7:{
    position:"absolute",
    width:10,
    height:60,
    backgroundColor:"black",
    bottom:80,
    left:35,
    borderWidth:1,
    borderColor:"white",
  },
  frame8:{
    position:"absolute",
    width:60,
    height:10,
    backgroundColor:"black",
    bottom:80,
    left:35,
    borderWidth:1,
    borderColor:"white",
  },
});
