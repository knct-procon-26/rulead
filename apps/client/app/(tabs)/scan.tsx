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
import Map, { Area } from "@/components/scan/map";
import { api } from "@/lib/client";
import Confirm from "@/components/scan/confirm";

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

  const onPictureTaken = (photo: CameraCapturedPicture) => {
    setPhoto(photo);
    if (photo.base64 === undefined) return;
    setScanState("map");
    (async () => {
      // const res = await api.api.scan.$post({
      //   json: { base64Image: photo.base64 ?? "" },
      // });
      const res = await api.api.scan.$post({
        json: { base64Image: photo.base64 ?? "" },
      });
      console.log(res);
      const data = await res.json();
      if (data?.success === true) {
        setRules(data.rules);
      } else {
        console.log("?");
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
      const data = await res.json();
      console.log("Rules saved:", data); //TODO
    })();
  };

  /*
  ・ゴミを散らかしてはいけません。
  ・人を集めてください。
  */

  return (
    <View style={styles.container}>
      {scanState === "camera" && <Camera onPictureTaken={onPictureTaken} />}
      {scanState === "map" && <Map onLocationDecided={onLocationDecided} />}
      {scanState === "confirm" && (
        <Confirm onConfirm={onConfirm} rules={rules} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
