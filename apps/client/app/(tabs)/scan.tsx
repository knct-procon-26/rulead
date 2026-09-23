import { StyleSheet, TouchableOpacity } from "react-native";
import EditScreenInfo from "@/components/EditScreenInfo";
import { Text, View } from "@/components/Themed";
import { Link } from "expo-router";
import {
  CameraCapturedPicture,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { useRef, useState } from "react";
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
  iconId: number;
  iconName: string;
  iconType: "prohibition" | "caution" | "information";
  keywords: { id: number; label: string }[];
};
export default function ScanTab() {
  const [scanState, setScanState] = useState<ScanState>("camera");
  const [photo, setPhoto] = useState<CameraCapturedPicture | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [area, setArea] = useState<Area | null>(null);
  const router = useRouter();
  const scanIdRef = useRef(0);
  const submittingRef = useRef(false);

  const reset = () => {
    scanIdRef.current++;
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
    const scanId = ++scanIdRef.current;
    (async () => {
      try {
        const res = await api.api.scan.$post({
          json: { base64Image: photo.base64 ?? "" },
        });

        if (res.ok) {
          const data = await res.json();
          if (scanId !== scanIdRef.current) return;
          setRules(data.rules);
        } else {
          const err = await res.json();
          if (scanId !== scanIdRef.current) return;
          await end(err.error);
        }
      } catch (error) {
        if (scanId !== scanIdRef.current) return;
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
    if (!area || submittingRef.current) return;
    submittingRef.current = true;
    console.log(area);
    if (!area) return;
    try {
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
          ruleIds: rules.map((rule) => rule.id),
        },
      });
      if (res.ok) {
        router.navigate("/(tabs)/collection");
        await end();
      } else {
        const err = await res.json();
        await end(err.error);
      }
    } catch {
      await end("Failed to connect with API.");
    } finally {
      submittingRef.current = false;
    }
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
