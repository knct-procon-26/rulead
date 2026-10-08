import {
  CameraCapturedPicture,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Image,
  Text,
  type LayoutChangeEvent,
  type ViewStyle,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useFocusEffect } from "expo-router";
import { useT } from "@/lib/i18n";
import * as ParkTracker from "@/modules/park-tracker";

function frameCornerSize(): number {
  try {
    const src = Image.resolveAssetSource(
      require("../../assets/images/frame.png"),
    );
    const size = Math.max(src?.width ?? 0, src?.height ?? 0);
    return Number.isFinite(size) && size > 0 ? size : 40;
  } catch {
    return 40;
  }
}
const FRAME_CORNER = frameCornerSize();
const HINT_TOP = 40 + FRAME_CORNER + 8;
const HINT_SIDE_INSET = 35 + FRAME_CORNER + 8;
const HINT_SPAN_TOP = 40 + 8;
const HINT_SPAN_BOTTOM = 100 + 8;
const HINT_BAND = 120;

type Size = { width: number; height: number };

function sidewaysHintStyle(
  rotation: ParkTracker.DeviceRotation,
  size: Size | null,
): ViewStyle | null {
  if (size === null || (rotation !== 90 && rotation !== 270)) return null;
  const length = size.height - HINT_SPAN_TOP - HINT_SPAN_BOTTOM;
  const band = Math.min(HINT_BAND, size.width - HINT_SIDE_INSET * 2);
  if (length <= 0 || band <= 0) return null;
  const centerY = HINT_SPAN_TOP + length / 2;
  const centerX =
    rotation === 270
      ? size.width - HINT_SIDE_INSET - band / 2
      : HINT_SIDE_INSET + band / 2;
  return {
    position: "absolute",
    left: centerX - length / 2,
    top: centerY - band / 2,
    width: length,
    height: band,
    alignItems: "center",
    justifyContent: "flex-start",
    transform: [{ rotate: rotation === 270 ? "90deg" : "-90deg" }],
  };
}

type props = {
  onPictureTaken: (photo: CameraCapturedPicture) => void;
};

export default function Camera({ onPictureTaken }: props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [camera, setCamera] = useState<CameraView | null>(null);
  const [zoom, setZoom] = useState(0);
  const [rotation, setRotation] = useState<ParkTracker.DeviceRotation>(0);
  const [size, setSize] = useState<Size | null>(null);
  const t = useT();

  useEffect(() => {
    const sub = ParkTracker.addListener("DeviceOrientation", (e) =>
      setRotation(e.degrees),
    );
    return () => sub.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setRotation(0);
      ParkTracker.startOrientationWatch().catch(() => {});
      return () => {
        ParkTracker.stopOrientationWatch().catch(() => {});
        setRotation(0);
      };
    }, []),
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev !== null && prev.width === width && prev.height === height
        ? prev
        : { width, height },
    );
  };

  const zoomRef = useRef(0);
  const startZoom = useRef(0);
  const pinchGesture = Gesture.Pinch()
    .runOnJS(true)
    .onBegin(() => {
      startZoom.current = zoomRef.current;
    })
    .onUpdate((event) => {
      const newZoom = Math.min(
        Math.max(startZoom.current + (event.scale - 1) * 0.5, 0),
        1,
      );

      zoomRef.current = newZoom;
      setZoom(newZoom);
    });

  if (!permission) {
    return <View></View>;
  }

  if (!permission.granted) {
    requestPermission();
    return <View></View>;
  }

  async function takePicture() {
    if (camera) {
      const photo = await camera.takePictureAsync({
        base64: true,
      });
      onPictureTaken(photo);
    }
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={pinchGesture}>
        <View style={styles.container} onLayout={onLayout}>
          <CameraView
            style={styles.camera}
            ref={(ref) => setCamera(ref)}
            zoom={zoom}
          ></CameraView>
          <Image
            style={styles.frame1}
            source={require("../../assets/images/frame.png")}
          />
          <Image
            style={styles.frame2}
            source={require("../../assets/images/frame.png")}
          />
          <Image
            style={styles.frame3}
            source={require("../../assets/images/frame.png")}
          />
          <Image
            style={styles.frame4}
            source={require("../../assets/images/frame.png")}
          />
          <View style={[styles.screen_base, styles.topScreen]}></View>
          <View style={[styles.screen_base, styles.bottomScreen]}></View>
          <View style={[styles.screen_base, styles.leftScreen]}></View>
          <View style={[styles.screen_base, styles.rightScreen]}></View>
          <View
            style={sidewaysHintStyle(rotation, size) ?? styles.hint}
            pointerEvents="none"
          >
            <Text style={styles.hintText}>{t.scanCamera.hint}</Text>
          </View>
          <Pressable
            onPress={takePicture}
            style={styles.button}
            accessibilityRole="button"
            accessibilityLabel={t.scanCamera.shutter}
          ></Pressable>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
  },
  button: {
    position: "absolute",
    bottom: 10,
    left: "50%",
    transform: [{ translateX: -40 }],
    width: 80,
    height: 80,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderColor: "rgba(0, 0, 0, 0.5)",
    borderWidth: 5,
    borderRadius: 40,
  },
  frame1: {
    position: "absolute",
    left: 35,
    top: 40,
  },
  frame2: {
    position: "absolute",
    right: 35,
    top: 40,
    transform: [{ rotate: "90deg" }],
  },
  frame3: {
    position: "absolute",
    right: 35,
    bottom: 100,
    transform: [{ rotate: "180deg" }],
  },
  frame4: {
    position: "absolute",
    left: 35,
    bottom: 100,
    transform: [{ rotate: "270deg" }],
  },
  screen_base: {
    position: "absolute",
    opacity: 0.3,
    backgroundColor: "black",
  },
  topScreen: {
    top: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  bottomScreen: {
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  leftScreen: {
    top: 40,
    bottom: 100,
    left: 0,
    width: 35,
  },
  rightScreen: {
    top: 40,
    bottom: 100,
    right: 0,
    width: 35,
  },
  hint: {
    position: "absolute",
    top: HINT_TOP,
    left: 43,
    right: 43,
    alignItems: "center",
  },
  hintText: {
    color: "#ffffff",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderRadius: 8,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
