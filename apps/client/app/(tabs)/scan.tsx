import {StyleSheet, TouchableOpacity } from "react-native";
import EditScreenInfo from "@/components/EditScreenInfo";
import { Text, View } from "@/components/Themed";
import {Link} from "expo-router";
import {
  CameraCapturedPicture,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { useState } from "react";
import Camera from "@/components/scan/camera";
import Map from "@/components/scan/map";
import { api } from "@/lib/client";
import {viewError} from "../../lib/utility";
type ScanState = "camera"| "map" |"confirm";
type Rule = {
  id: string;
  text: string;
};
export default function ScanTab(){
  const [scanState, setScanState] = useState<ScanState>("camera");
  const [photo, setPhoto] = useState<CameraCapturedPicture | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
 
  const end=(mode:ScanState,message?:string)=>{
    if(message)viewError(message);
    setPhoto(null);
    setRules([]);
    setScanState(mode);
  };

  const onPictureTaken = (photo: CameraCapturedPicture) => {
    setPhoto(photo);
    if (photo.base64 === undefined) return;
    setScanState("map");
    (async () => {
     try{
      const res = await api.api.scan.$post({
        json: { base64Image: photo.base64 ?? "" },
      });
    
      if(!res.ok){
        const err = await res.json();
        if(!err.success){
          end("camera",err.message); 
          return;
        }
      }
        const data= await res.json();
        if(data.success){
            setRules(data.rules);
        } 
    }catch(error){
        end("camera","Failed to connect with API.");
      }
  }
  )();
  };
  
  const onLocationDecided = () => {
    setScanState("confirm");
  };

  return (
    <View style={styles.container}>
      {scanState === "camera" && <Camera onPictureTaken={onPictureTaken} />}
      {scanState === "map" && <Map onLocationDecided={onLocationDecided} />}
      {rules.length===0 && scanState === "confirm" && (
        <View>
          <Text style={styles.text}>ルールを抽出しています。</Text>
        </View>
      )}
      {rules.length>0 && scanState === "confirm" && (
        <View style={styles.container}> 
          {rules.map((rule) => (
            <Text key={rule.id}>{rule.text}</Text>
          ))}
          <TouchableOpacity style={styles.button1} onPress={()=>{end("camera");}}>
            <Text style={styles.text}>別の看板を撮影</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button2} onPress={()=>{end("camera");}}>
            <Link href="./b" style={styles.text}>コレクションを見る</Link>
          </TouchableOpacity>
        </View>
        
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  text:{
    fontSize:20,
    padding:30,
    color:"black"
  },
  button1:{
    position:"absolute",
    top:"80%",
    bottom:0,
    right:"50%",
    left:0,
    backgroundColor:"pink",
  },
  button2:{
    position:"absolute",
    top:"80%",
    bottom:0,
    left:"50%",
    right:0,
    backgroundColor:"orange",
  }
});
