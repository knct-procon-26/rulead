import { Pressable, StyleSheet } from "react-native";
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
import {viewError} from "../../lib/utility";
type ScanState = "camera"| "map" |"confirm";
type Rule = {
  id: string;
  text: string;
};
type response={
  success:boolean;
  rules:Rule[];
};
const search_Ercode=(code:number)=>{
  let tmp:string="";
  switch(code){
    case 400:tmp="But request";
             break;
    case 401:tmp="Unauthorized";
             break;
    case 403:tmp="Forbidden";
             break;
    case 429:tmp="Too many request";
             break;
    case 500:tmp="Internal server error";
             break;
    case 502:tmp="Bad gateway";
             break;
    case 503:tmp="Service Unavailable";
             break;
    default:tmp="something went wrong";
            break;
  }
  return tmp;
};//メッセージの内容はもう少し考える
 class HTTPException extends Error{
  public message:string;
  public id:number;
 constructor(
  public readonly errorCode:number,
 ){
  super();
  this.id=errorCode;
  this.message=search_Ercode(this.id);
 }
}

  

export default function ScanTab(){
  const [scanState, setScanState] = useState<ScanState>("camera");
  const [photo, setPhoto] = useState<CameraCapturedPicture | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [err,setErr]=useState<HTTPException|Error|undefined>(undefined);
 
  const end=(mode:ScanState,message:string)=>{
    viewError(message);
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
      if(!res.ok) throw new HTTPException(res.status);
      else{
      
        const data:response = await res.json();
        if(data.rules.length=== 0){
         end("camera","ルールを抽出できませんでした。もう一度おねがいします。");
        }
        else{
          if(data.success){
            setRules(data.rules);
          }
          else {
            end("camera","撮影したものはおそらく看板ではありません。看板を撮影してください。");
          }
        }
      }
    }catch(error){
       if(error instanceof Error || error instanceof HTTPException){
           setErr(error);
       }
       else console.log("type of error is not such as Error.");
    }
  }
  )();
  };
  
  const onLocationDecided = () => {
    setScanState("confirm");
     if(err!==undefined)end("camera",err.message);
  };

  return (
    <View style={styles.container}>
      {scanState === "camera" && <Camera onPictureTaken={onPictureTaken} />}
      {scanState === "map" && <Map onLocationDecided={onLocationDecided} />}
      {rules.length===0 && (
        <View>
          <Text>ルールを抽出しています。</Text>
        </View>
      )}
      {rules.length>0 && scanState === "confirm" && (
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
  }
});
