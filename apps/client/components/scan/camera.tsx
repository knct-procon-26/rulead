import {
  CameraCapturedPicture,
  CameraView,
  PermissionStatus,
  useCameraPermissions,
} from "expo-camera";
import { useEffect, useState, useRef } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Image,
  Text,
  Linking,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { useT } from "@/lib/i18n";
import Colors from "@/constants/Colors";

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
const HINT_TOP = 40 + frameCornerSize() + 8;

type props = {
  onPictureTaken: (photo: CameraCapturedPicture) => void;
};

export default function Camera({ onPictureTaken }: props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [camera, setCamera] = useState<CameraView | null>(null);
  const [zoom, setZoom] = useState(0);
  const t = useT();
  const askedRef = useRef(false);

  // 許可の確認は描画中ではなく effect で1回だけ行う
  // （描画中に呼ぶと、拒否されたときに確認→再描画→確認…を繰り返すため）
  useEffect(() => {
    if (
      permission &&
      permission.status === PermissionStatus.UNDETERMINED &&
      !askedRef.current
    ) {
      askedRef.current = true;
      requestPermission().catch((e) => console.warn(e));
    }
  }, [permission, requestPermission]);

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
    if (permission.status === PermissionStatus.UNDETERMINED) {
      return <View></View>;
    }
    // 拒否されている：iOS ではもう確認ダイアログを出せないので、設定へ案内する
    return (
      <View style={styles.denied}>
        <Text style={styles.deniedText}>{t.scanCamera.permissionDenied}</Text>
        <Pressable
          onPress={() => Linking.openSettings().catch((e) => console.warn(e))}
          style={({ pressed }) => [
            styles.deniedButton,
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.deniedButtonText}>{t.common.openSettings}</Text>
        </Pressable>
      </View>
    );
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
        <View style={styles.container}>
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
          <View style={styles.hint} pointerEvents="none">
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
  denied: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  deniedText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
    textAlign: "center",
  },
  deniedButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.tint,
  },
  deniedButtonText: {
    fontSize: 15,
    fontWeight: "bold",
    color: Colors.background,
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
