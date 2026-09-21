import { Text } from "@/components/Themed";
import { getCurrentLocation, reverseGeocode } from "@/lib/utility";
import { useCallback, useEffect, useState } from "react";
import { Button, StyleSheet, View,TouchableOpacity,Image,TextInput} from "react-native";
import MapView, {
  LatLng,
  Marker,
  Polygon,
  PROVIDER_GOOGLE,
} from "react-native-maps";
type props = {
  onLocationDecided: (area: Area) => void;
};
type Id={
 id:number;
};
let nextPointId = 0;
const createPointId = () => Date.now() * 1000 + nextPointId++;
export type Area = {
  geometry: (LatLng&Id)[];
  name: string;
  address: string;
};

export default function Map({ onLocationDecided }: props) {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [address, setAddress] = useState<string>("");
  const [index, setIndex] = useState<number>(0);
  const [points,setPoints]=useState<(LatLng&Id)[]>([]);
  const [text,setText]=useState<string|undefined>(undefined);
  const [mode,setMode]=useState<"nothing"|"add"|"remove">("nothing");
  const getLocation = async () => {
    try {
      const location = await getCurrentLocation();
      setLocation(location);
    } catch (error) {
      // TODO: エラー処理を適切に行う
      console.error("位置情報の取得に失敗しました:", error);
    }
  };
  const getArea = async (latitude: number, longitude: number) => {
    try {
      const result = await reverseGeocode(latitude, longitude);
      const areas = result.elements.map((element) => ({
        geometry: element.geometry.map((point) => ({
          latitude: point.lat,
          longitude: point.lon,
          id:createPointId()
        })),
        name: element.tags.name || element.tags["name:en"] || "",
        address: result.address??"",
      }));
      setAreas(areas);
    } catch (error) {
      console.error("エリア情報の取得に失敗しました:", error);
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

useEffect(() => {
  if (
    areas.length === 0 ||
    index >= areas.length
  ) {
    return;
  }

  setPoints([...areas[index].geometry]);
  setAddress(areas[index].address);
}, [areas, index]);
  useEffect(() => {
    if (!location) return;

    getArea(location.latitude, location.longitude);
  }, [location]);

  const onPress = () => {
    console.log(areas);
  const Uparea=areas.map((v,i)=>{
if(i===index)return {
  geometry:points,
  name:text ?? areas[index].name,
  address:v.address
};
else return v;
}
);
　　setAreas(Uparea);
    onLocationDecided(Uparea[index]);
    setPoints([]);
    setMode("nothing");
    setText(undefined);
  };
  const addP=(p:LatLng&Id)=>{setPoints((prev)=>[...prev,p]);};
  // TODO: 自分でエリアを囲って決定できるようにする。
  // TODO: 公園の名前を変更できるようにする
  return (
    <View style={styles.container}>
      <Text>
        現在の位置:{" "}
        {location ? `${location.latitude}, ${location.longitude}` : "取得中..."}
      </Text>
      {areas.length > 0 && <Text>公園の名前: {text??areas[index].name}</Text>}
      <Text>住所: {address}</Text>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location?.latitude || 33.5788760503074,
          longitude: location?.longitude || 130.39915522048497,
          latitudeDelta: 0.001,
          longitudeDelta: 0.001,
        }}
        provider={PROVIDER_GOOGLE}
        showsCompass={true}
       
        onPress={(e)=>{
          if(mode==="add")addP({
          latitude:e.nativeEvent.coordinate.latitude,
          longitude:e.nativeEvent.coordinate.longitude,
          id:createPointId()
        })}}
      >
        <Marker 
         draggable
          coordinate={{
            latitude: location?.latitude || 33.5788760503074,
            longitude: location?.longitude || 130.39915522048497,
          }}
          onDragEnd={(e)=>{setLocation(e.nativeEvent.coordinate)}}
        />
        {areas.length > 0 && points.length > 2 &&(
          <Polygon
            coordinates={points}
            strokeColor="rgba(9, 255, 0, 0.5)"
            fillColor="rgba(0, 255, 42, 0.2)"
            strokeWidth={2}
          />
        )}
        {mode!=="nothing"&&(
         points.map(point=>(
         <Marker            
           draggable={mode==="add"}
           key={point.id} 
           coordinate={{
          latitude:point.latitude,
          longitude:point.longitude
         }}
onPress={() => {
  if (mode==="remove") {
    setPoints(prev => 
       prev.filter(v => v.id !== point.id)
    );
  }
}}
          onDragEnd={(e)=>{
          const k=points.map((v)=>{
          if(v.id===point.id){
            return {latitude:e.nativeEvent.coordinate.latitude,
                    longitude:e.nativeEvent.coordinate.longitude,
                    id:v.id
            };
          }else{
            return v;
          }
         });
         setPoints(k);
         }
        }>
      <Image   style={styles.pin}   source={require('../../assets/images/vertex3.png')} resizeMode="contain"/>
       </Marker>
  )
)
)
}
<TextInput 
placeholder="公園名を入力"
style={styles.txtbx}
onChangeText={(value)=>{setText(value);}}
value={text}
/>

    </MapView>
      <Button
        title="See Others"
        onPress={() => setIndex((prev) => (prev + 1) % areas.length)}
      />
      <Button title="submit" onPress={onPress}/>
<TouchableOpacity　style={styles.button1} onPress={()=>{setMode("add");}}>
<Text style={styles.text1}>+</Text>
</TouchableOpacity>
<TouchableOpacity　style={styles.button2} onPress={()=>{setMode("remove");}}>
<Text style={styles.text2}>-</Text>
</TouchableOpacity>
<TouchableOpacity　style={styles.button3} onPress={()=>{setMode("nothing");}}>
<Text style={styles.text1}>x</Text>
</TouchableOpacity>
</View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  button1:{
    position:"absolute",
    opacity:0.7,
    width:40,
    height:40,
    right:5,
    top:"25%",
    backgroundColor:"rgba(172, 210, 193, 0.7)",
    borderColor:"black",
    borderRadius:5
  },
  button2:{
    position:"absolute",
    opacity:0.7,
    width:40,
    height:40,
    right:5,
    top:"35%",
    backgroundColor:"rgba(193, 123, 123, 0.63)",
    borderColor:"black",
    borderRadius:5
  },
  button3:{
    position:"absolute",
    opacity:0.7,
    width:40,
    height:40,
    right:5,
    top:"45%",
    backgroundColor:"rgba(126, 136, 189, 0.63)",
    borderColor:"black",
    borderRadius:5
  },
  pin:{
    width:40,
    height:40,
  },
  txtbx:{
    position:"absolute",
    borderColor:"black",
    borderWidth:1,
    right:5,
    top:5,
    left:"15%",
    height:"10%",
    fontSize:15,
    borderRadius:10
  },
  text1:{
    fontSize:30,
    textAlign:"center"
  },
  text2:{
    fontSize:40,
    bottom:"35%",
    left:"35%"
  }
});
