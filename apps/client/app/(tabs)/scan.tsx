import { Image, Modal, Pressable, StyleSheet } from "react-native";
import { useNetInfo } from "@react-native-community/netinfo";
import Animated,{ cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
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
import { api } from "@/lib/client";
type ScanState = "camera"| "load" | "map" |"confirm";
type Rule = {
  id: string;
  text: string;
};
type response={
  success:boolean;
  rules:Rule[];
};

export default function ScanTab() {
  const [scanState, setScanState] = useState<ScanState>("camera");
  const [photo, setPhoto] = useState<CameraCapturedPicture | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [visibility,setVisibility]=useState(false);
  const d=useSharedValue(0);
  const net=useNetInfo(); 
  const load=()=>{
      d.value=withRepeat(
      withTiming(360,{
      duration:1000,
      easing:Easing.linear,
      reduceMotion:ReduceMotion.System
      }
     ),60,false,(finished)=>{
    if(finished){
     alert("処理に時間がかかりました。お手数ですが、もう一度撮影してください。");
  　 d.value=0;
     setScanState("camera");
    }
    else d.value=0;
  }
);

  };
  const animatedStyle=useAnimatedStyle(
    () => {
      const rotate=d.value.toString()+'deg';
      return (
         {
          width:150,
          height:150,
          transform:[{rotate:rotate}]
         }
      );
    }
  );
  
  
  const onPictureTaken = (photo: CameraCapturedPicture) => {
    setPhoto(photo);
    if (photo.base64 === undefined) return;
    setScanState("load");
    load();
    (async () => {
        try{
if(net.isConnected){   
      const res = await api.api.scan.$post({
        json: { base64Image: photo.base64 ?? "" },
      });
      if(!res.ok){
        alert("サーバーとの通信に失敗しました。");
        setScanState("camera");
      }
      else{
        const data:response = await res.json();
        if(data.rules.length=== 0){
          cancelAnimation(d);
            d.value=0;
            alert("ルールを抽出できませんでした。もう一度おねがいします。");
            setScanState("camera");
        }
        else{
          if(data.success){
            setRules(data.rules);
            cancelAnimation(d);
            d.value=0;
            setScanState("map");
          }
          else {
            cancelAnimation(d);
            d.value=0;
            alert("撮影したものはおそらく看板ではありません。看板を撮影してください。");
            setScanState("camera");
          }
        }
      }
      }
      else {
        alert("ネットに接続できませんでした。");
        setScanState("camera");
        cancelAnimation(d);
        d.value=0;
      }
    }catch(error){
        alert("処理に失敗しました。");
       cancelAnimation(d);
       d.value=0;
       setVisibility(true);
      }
    })();
  };

  const onLocationDecided = () => {
    setScanState("confirm");
  };

  const reload=()=>{
  setRules([]);
  setPhoto(null);
	setVisibility(false);
  setScanState("camera");
};

  const modify=()=>{
    setVisibility(false);
    setScanState("map");
  };
  return (
    <View style={styles.container}>
      {scanState === "camera" && <Camera onPictureTaken={onPictureTaken} />}
      {scanState === "load" && (
        <View style={styles.centre}>
        <Animated.Image style={animatedStyle} source={require("../../assets/images/load_img.png")} />
        </View>
    )}
      {scanState === "map" && <Map onLocationDecided={onLocationDecided} />}
      {visibility===true&& (
       <Modal
            animationType="slide"
            transparent={true}
            visible={visibility}
            onRequestClose={
            ()=>{
              setVisibility(false);
            }
            }
            >
            <View style={styles.modal}>
            <Image  style={styles.error} source={require("../../assets/images/error.png")}/>
            <Image  style={[styles.back,styles.base]} source={require("../../assets/images/return.png")}/>
            <Pressable style={[styles.base,styles.back,styles.button]} onPress={modify}></Pressable>
            <Image  style={[styles.reload,styles.base]} source={require("../../assets/images/reload.png")}/>
            <Pressable style={[styles.base,styles.reload,styles.button]} onPress={reload}></Pressable>
            <View style={styles.line1}></View>
            <View style={styles.line2}></View>
            </View>
            </Modal>
      )}
      
      { rules.length>0 && scanState === "confirm" && (
        <View> 
          {rules.map((rule) => (
            <Text key={rule.id}>{rule.text}</Text>
          ))}
        </View>
      )}

    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centre:{
  flex:1,
  alignItems:"center",
  justifyContent:"center"
  },
  modal:{
	position:"absolute",
	bottom:"50%",
	right:90,
	left:90,
	backgroundColor:"white",
	borderRadius:10,
	borderWidth:1,
	shadowColor:"black",
	shadowOffset:{width:3,height:3},
	shadowOpacity: 0.25,
	shadowRadius: 4,
	elevation: 5,
	height:150,
},
base:{
	position:"absolute",
	height:50,
	width:"auto",
	bottom:0,
	backgroundColor:"white",
	borderRadius:10
},
button:{
	opacity:0,
},
back:{
	right:"50%",
	left:0,
},
reload:{
	left:"50%",
	right:0,
},
error:{
	position:"absolute",
	height:"auto",
	width:"auto",
	left:0,
	right:0,
	top:0,
	bottom:50,
	backgroundColor:"white",
	borderRadius:10
},
line1:{
	position:"absolute",
    left:0,
	right:0,
	backgroundColor:"black",
    bottom:50,
	height:1,
},
line2:{
	position:"absolute",
	width:1,
	height:50, 
	backgroundColor:"black",
	left:"50%",
	bottom:0,
}
});
