import { StyleSheet, View } from "react-native";
import { CameraCapturedPicture } from "expo-camera";
import { useRef, useState } from "react";
import Camera from "@/components/scan/camera";
import Map, { Area } from "@/components/scan/map";
import { api } from "@/lib/client";
import { viewError } from "@/lib/utility";
import Confirm from "@/components/scan/confirm";
import { useRouter } from "expo-router";
import Colors from "@/constants/Colors";
import type { ScannedRule } from "@/components/rules/types";
import * as ParkTracker from "@/modules/park-tracker";

type ScanState = "camera" | "map" | "confirm";

export default function ScanTab() {
  const [scanState, setScanState] = useState<ScanState>("camera");
  const [rules, setRules] = useState<ScannedRule[] | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const router = useRouter();
  const scanIdRef = useRef(0);
  const submittingRef = useRef(false);

  const reset = () => {
    scanIdRef.current++;
    setRules(null);
    setArea(null);
    setScanState("camera");
  };

  const end = async (message?: string) => {
    if (message) await viewError(message);
    reset();
  };

  const onPictureTaken = (photo: CameraCapturedPicture) => {
    const base64Image = photo.base64;
    if (base64Image === undefined) return;
    setRules(null);
    setScanState("map");
    const scanId = ++scanIdRef.current;
    (async () => {
      try {
        const res = await api.api.scan.$post({
          json: { base64Image },
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
    setScanState("confirm");
  };

  const onConfirm = async () => {
    if (!area || !rules || rules.length === 0 || submittingRef.current) return;
    submittingRef.current = true;
    try {
      const res = await api.api.rules.$post({
        json: {
          park: {
            id: area.parkId,
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
        ParkTracker.refreshParks().catch(() => {});
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

  return (
    <View style={styles.container}>
      {scanState === "camera" && <Camera onPictureTaken={onPictureTaken} />}
      {scanState === "map" && (
        <Map onLocationDecided={onLocationDecided} end={end} />
      )}
      {scanState === "confirm" && (
        <Confirm rules={rules} area={area} onConfirm={onConfirm} end={end} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
