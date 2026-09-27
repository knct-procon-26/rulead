import { getCurrentLocation, reverseGeocode } from "@/lib/utility";
import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import MapView, {
  LatLng,
  Marker,
  Polygon,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import Colors from "@/constants/Colors";

type props = {
  onLocationDecided: (area: Area) => void;
  end: (message?: string) => Promise<void>;
};

export type Area = {
  geometry: LatLng[];
  name: string;
  address: string;
};

export default function Map({ onLocationDecided, end }: props) {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [index, setIndex] = useState<number>(0);

  const getLocation = async () => {
    try {
      const location = await getCurrentLocation();
      setLocation(location);
    } catch (error) {
      await end("Failed to retrieve location information.");
    }
  };

  const getArea = async (latitude: number, longitude: number) => {
    try {
      const result = await reverseGeocode(latitude, longitude);
      if (result.areas.length === 0) {
        await end("No park was found at your current location.");
        return;
      }
      const areas = result.areas.map((area) => ({
        geometry: area.geometry,
        name: area.name,
        address: result.address,
      }));
      setIndex(0);
      setAreas(areas);
    } catch (error) {
      await end("Failed to retrieve area information.");
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  useEffect(() => {
    if (!location) return;

    getArea(location.latitude, location.longitude);
  }, [location]);

  const current = areas.length > 0 ? areas[index] : null;

  const onPress = () => {
    if (current) onLocationDecided(current);
  };

  // TODO: 自分でエリアを囲って決定できるようにする。
  // TODO: 公園の名前を変更できるようにする
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        現在の位置:{" "}
        {location ? `${location.latitude}, ${location.longitude}` : "取得中..."}
      </Text>
      {current && <Text style={styles.text}>公園の名前: {current.name}</Text>}
      <Text style={styles.text}>住所: {current?.address ?? ""}</Text>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location?.latitude || 33.5788760503074,
          longitude: location?.longitude || 130.39915522048497,
          latitudeDelta: 0.001,
          longitudeDelta: 0.001,
        }}
        provider={PROVIDER_GOOGLE}
      >
        <Marker
          coordinate={{
            latitude: location?.latitude || 33.5788760503074,
            longitude: location?.longitude || 130.39915522048497,
          }}
        />
        {current && (
          <Polygon
            coordinates={current.geometry}
            strokeColor="rgba(9, 255, 0, 0.5)"
            fillColor="rgba(0, 255, 42, 0.2)"
            strokeWidth={2}
          />
        )}
      </MapView>
      <Button
        title="See Others"
        onPress={() => setIndex((prev) => (prev + 1) % areas.length)}
        disabled={areas.length === 0}
      />
      <Button title="submit" onPress={onPress} disabled={current === null} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  text: {
    color: Colors.text,
  },
  map: {
    flex: 1,
  },
});

// 以下、コンフリクト：
// import { getCurrentLocation, reverseGeocode } from "@/lib/utility";
// import { useEffect, useState } from "react";
// import {
//   Button,
//   StyleSheet,
//   View,
//   TouchableOpacity,
//   Image,
//   TextInput,
//   Text,
// } from "react-native";
// import MapView, {
//   LatLng,
//   Marker,
//   Polygon,
//   PROVIDER_GOOGLE,
// } from "react-native-maps";
// import Colors from "@/constants/Colors";

// type props = {
//   onLocationDecided: (area: Area) => void;
//   end: (message?: string) => Promise<void>;
// };

// type Id = {
//   id: number;
// };

// let nextPointId = 0;
// const createPointId = () => Date.now() * 1000 + nextPointId++;

// export type Area = {
//   geometry: (LatLng & Id)[];
//   name: string;
//   address: string;
// };

// export default function Map({ onLocationDecided, end }: props) {
//   const [location, setLocation] = useState<LatLng | null>(null);
//   const [areas, setAreas] = useState<Area[]>([]);
//   const [address, setAddress] = useState<string>("");
//   const [index, setIndex] = useState<number>(0);
//   const [points, setPoints] = useState<(LatLng & Id)[]>([]);
//   const [text, setText] = useState<string | undefined>(undefined);
//   const [mode, setMode] = useState<"nothing" | "add" | "remove">("nothing");

//   const getLocation = async () => {
//     try {
//       const location = await getCurrentLocation();
//       setLocation(location);
//     } catch (error) {
//       await end("Failed to retrieve location information.");
//     }
//   };

//   const getArea = async (latitude: number, longitude: number) => {
//     try {
//       const result = await reverseGeocode(latitude, longitude);
//       const areas = result.elements.map((element) => ({
//         geometry: element.geometry.map((point) => ({
//           latitude: point.lat,
//           longitude: point.lon,
//           id: createPointId(),
//         })),
//         name: element.tags.name || element.tags["name:en"] || "",
//         address: result.address ?? "",
//       }));
//       setAreas(areas);
//     } catch (error) {
//       await end("Failed to retrieve area information.");
//     }
//   };

//   useEffect(() => {
//     getLocation();
//   }, []);

//   useEffect(() => {
//     if (areas.length === 0 || index >= areas.length) {
//       return;
//     }

//     setPoints([...areas[index].geometry]);
//     setAddress(areas[index].address);
//   }, [areas, index]);

//   useEffect(() => {
//     if (!location) return;

//     getArea(location.latitude, location.longitude);
//   }, [location]);

//   const current = areas.length > 0 ? areas[index] : null;

//   const onPress = () => {
//     if (!current) return;

//     const updatedAreas = areas.map((area, i) => {
//       if (i !== index) return area;
//       return {
//         geometry: points,
//         name: text ?? area.name,
//         address: area.address,
//       };
//     });

//     setAreas(updatedAreas);
//     onLocationDecided(updatedAreas[index]);
//     setPoints([]);
//     setMode("nothing");
//     setText(undefined);
//   };

//   const addP = (p: LatLng & Id) => {
//     setPoints((prev) => [...prev, p]);
//   };

//   // TODO: 公園の名前を変更できるようにする
//   return (
//     <View style={styles.container}>
//       <Text style={styles.text}>
//         現在の位置:{" "}
//         {location ? `${location.latitude}, ${location.longitude}` : "取得中..."}
//       </Text>
//       {current && (
//         <Text style={styles.text}>公園の名前: {text ?? current.name}</Text>
//       )}
//       <Text style={styles.text}>住所: {address}</Text>
//       <MapView
//         style={styles.map}
//         initialRegion={{
//           latitude: location?.latitude || 33.5788760503074,
//           longitude: location?.longitude || 130.39915522048497,
//           latitudeDelta: 0.001,
//           longitudeDelta: 0.001,
//         }}
//         provider={PROVIDER_GOOGLE}
//         showsCompass={true}
//         onPress={(e) => {
//           if (mode === "add")
//             addP({
//               latitude: e.nativeEvent.coordinate.latitude,
//               longitude: e.nativeEvent.coordinate.longitude,
//               id: createPointId(),
//             });
//         }}
//       >
//         <Marker
//           draggable
//           coordinate={{
//             latitude: location?.latitude || 33.5788760503074,
//             longitude: location?.longitude || 130.39915522048497,
//           }}
//           onDragEnd={(e) => {
//             setLocation(e.nativeEvent.coordinate);
//           }}
//         />
//         {areas.length > 0 && points.length > 2 && (
//           <Polygon
//             coordinates={points}
//             strokeColor="rgba(9, 255, 0, 0.5)"
//             fillColor="rgba(0, 255, 42, 0.2)"
//             strokeWidth={2}
//           />
//         )}
//         {mode !== "nothing" &&
//           points.map((point) => (
//             <Marker
//               draggable={mode === "add"}
//               key={point.id}
//               coordinate={{
//                 latitude: point.latitude,
//                 longitude: point.longitude,
//               }}
//               onPress={() => {
//                 if (mode === "remove") {
//                   setPoints((prev) => prev.filter((v) => v.id !== point.id));
//                 }
//               }}
//               onDragEnd={(e) => {
//                 const updatedPoints = points.map((v) => {
//                   if (v.id === point.id) {
//                     return {
//                       latitude: e.nativeEvent.coordinate.latitude,
//                       longitude: e.nativeEvent.coordinate.longitude,
//                       id: v.id,
//                     };
//                   }
//                   return v;
//                 });
//                 setPoints(updatedPoints);
//               }}
//             >
//               <Image
//                 style={styles.pin}
//                 source={require("../../assets/images/vertex3.png")}
//                 resizeMode="contain"
//               />
//             </Marker>
//           ))}
//         <TextInput
//           placeholder="公園名を入力"
//           style={styles.txtbx}
//           onChangeText={(value) => {
//             setText(value);
//           }}
//           value={text}
//         />
//       </MapView>
//       <Button
//         title="See Others"
//         onPress={() => setIndex((prev) => (prev + 1) % areas.length)}
//         disabled={areas.length === 0}
//       />
//       <Button title="submit" onPress={onPress} disabled={current === null} />
//       <TouchableOpacity
//         style={styles.button1}
//         onPress={() => {
//           setMode("add");
//         }}
//       >
//         <Text style={styles.text1}>+</Text>
//       </TouchableOpacity>
//       <TouchableOpacity
//         style={styles.button2}
//         onPress={() => {
//           setMode("remove");
//         }}
//       >
//         <Text style={styles.text2}>-</Text>
//       </TouchableOpacity>
//       <TouchableOpacity
//         style={styles.button3}
//         onPress={() => {
//           setMode("nothing");
//         }}
//       >
//         <Text style={styles.text1}>x</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: Colors.background,
//   },
//   text: {
//     color: Colors.text,
//   },
//   map: {
//     flex: 1,
//   },
//   button1: {
//     position: "absolute",
//     opacity: 0.7,
//     width: 40,
//     height: 40,
//     right: 5,
//     top: "25%",
//     backgroundColor: "rgba(172, 210, 193, 0.7)",
//     borderColor: "black",
//     borderRadius: 5,
//   },
//   button2: {
//     position: "absolute",
//     opacity: 0.7,
//     width: 40,
//     height: 40,
//     right: 5,
//     top: "35%",
//     backgroundColor: "rgba(193, 123, 123, 0.63)",
//     borderColor: "black",
//     borderRadius: 5,
//   },
//   button3: {
//     position: "absolute",
//     opacity: 0.7,
//     width: 40,
//     height: 40,
//     right: 5,
//     top: "45%",
//     backgroundColor: "rgba(126, 136, 189, 0.63)",
//     borderColor: "black",
//     borderRadius: 5,
//   },
//   pin: {
//     width: 40,
//     height: 40,
//   },
//   txtbx: {
//     position: "absolute",
//     borderColor: "black",
//     borderWidth: 1,
//     right: 5,
//     top: 5,
//     left: "15%",
//     height: "10%",
//     fontSize: 15,
//     borderRadius: 10,
//   },
//   text1: {
//     fontSize: 30,
//     textAlign: "center",
//   },
//   text2: {
//     fontSize: 40,
//     bottom: "35%",
//     left: "35%",
//   },
// });
