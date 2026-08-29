import { Button, StyleSheet } from "react-native";

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

type ScanState = "camera" | "map" | "confirm";
type Rule = {
  id: string;
  text: string;
};

export default function ScanTab() {
  const [scanState, setScanState] = useState<ScanState>("camera");
  const [photo, setPhoto] = useState<CameraCapturedPicture | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);

  const onPictureTaken = (photo: CameraCapturedPicture) => {
    setPhoto(photo);
    if (photo.base64 === undefined) return;
    setScanState("map");
    (async () => {
      const res = await api.api.scan.$post({
        json: { base64Image: photo.base64 ?? "" },
      });
      const data = await res.json();
      if (data?.success === true) {
        setRules(data.rules);
      } else {
        console.log("?");
      }
    })();
  };

  const onLocationDecided = () => {
    setScanState("confirm");
  };

  return (
    <View style={styles.container}>
      {scanState === "camera" && <Camera onPictureTaken={onPictureTaken} />}
      {scanState === "map" && <Map onLocationDecided={onLocationDecided} />}
      {scanState === "confirm" && (
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
});
