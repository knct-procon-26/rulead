import { StyleSheet, TouchableOpacity } from "react-native";
import EditScreenInfo from "@/components/EditScreenInfo";
import { Text, View } from "@/components/Themed";
import { Link } from "expo-router";
import {
  CameraCapturedPicture,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { useState } from "react";
import Camera from "@/components/scan/camera";
import Map, { Area } from "@/components/scan/map";
import { api } from "@/lib/client";
import { viewError } from "../../lib/utility";
import Confirm from "@/components/scan/confirm";
import { useRouter } from "expo-router";

type ScanState = "camera" | "map" | "confirm";
type Rule = {
  id: string;
  text: string;
};
export default function ScanTab() {
  const [scanState, setScanState] = useState<ScanState>("camera");
  const [photo, setPhoto] = useState<CameraCapturedPicture | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [area, setArea] = useState<Area | null>(null);
  const router = useRouter();

  const reset = () => {
    setPhoto(null);
    setRules([]);
    setArea(null);
    setScanState("camera");
  };

  const end = async (message?: string) => {
    if (message) await viewError(message);
    reset();
  };

  const onPictureTaken = (photo: CameraCapturedPicture) => {
    setPhoto(photo);
    if (photo.base64 === undefined) return;
    setScanState("map");
    (async () => {
      try {
        const res = await api.api.scan.$post({
          json: { base64Image: photo.base64 ?? "" },
        });

        if (res.ok) {
          const data = await res.json();
          setRules(data.rules);
        } else {
          const err = await res.json();
          await end(err.error);
        }
      } catch (error) {
        await end("Failed to connect with API.");
      }
    })();
  };

  const onLocationDecided = (area: Area) => {
    setArea(area);
    console.log(area);
    setScanState("confirm");
  };

  const onConfirm = async () => {
    console.log(area);
    if (!area) return;
    (async () => {
      const res = await api.api.rules.$post({
        json: {
          park: {
            name: area.name,
            address: area.address,
            geometry: area.geometry.map((point) => ({
              latitude: point.latitude,
              longitude: point.longitude,
            })),
          },
          rules: rules.map((rule) => ({
            id: rule.id,
            text: rule.text,
          })),
        },
      });
      console.log("Rules saved:", res);
      if (res.ok) {
        router.navigate("/(tabs)/collection");
        await end();
      } else {
        const err = await res.json();
        await end(err.error);
      }
    })();
  };

  /*
  ・ゴミを散らかしてはいけません。
  ・人を集めてください。
  */

  return (
    <View style={styles.container}>
      {scanState === "camera" && <Camera onPictureTaken={onPictureTaken} />}
      {scanState === "map" && (
        <Map onLocationDecided={onLocationDecided} end={end} />
      )}
      {scanState === "confirm" && (
        <Confirm onConfirm={onConfirm} rules={rules} end={end} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  text: {
    fontSize: 20,
    padding: 30,
    color: "black",
  },
  button1: {
    position: "absolute",
    top: "80%",
    bottom: 0,
    right: "50%",
    left: 0,
    backgroundColor: "pink",
  },
  button2: {
    position: "absolute",
    top: "80%",
    bottom: 0,
    left: "50%",
    right: 0,
    backgroundColor: "orange",
  },
});
