import { Alert } from "react-native";
import * as ParkTracker from "@/modules/park-tracker";
import Debug from "@/constants/Debug";
import { api, getToken, onTokenChange } from "@/lib/client";
import { getLanguage, onLanguageChange } from "@/lib/language";
import { getCameraWatchEnabled } from "@/lib/settings";

const API_URL = `${Debug.apiBaseUrl}/api/parks/nearby`;

function nearbyUrl(): string {
  return `${API_URL}?lang=${encodeURIComponent(getLanguage())}`;
}

export async function trackerOptions(
  outing = false,
): Promise<ParkTracker.TrackerOptions> {
  return {
    apiUrl: nearbyUrl(),
    headers: { Authorization: `Bearer ${await getToken()}` },
    outing,
  };
}

function alertAsync(title: string, message: string): Promise<void> {
  return new Promise((resolve) =>
    Alert.alert(title, message, [{ text: "OK", onPress: () => resolve() }], {
      cancelable: false,
    }),
  );
}

export async function startOuting(): Promise<boolean> {
  const p = await ParkTracker.requestPermissions();
  if (p.location !== "precise") {
    Alert.alert(
      "正確な位置情報が必要です",
      "公園に入ったことを判定するために使います。設定画面で位置情報を「正確な位置」にしてください。",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "設定を開く",
          onPress: () => {
            ParkTracker.openAppSettings().catch(() => {});
          },
        },
      ],
    );
    return false;
  }
  const wantCamera = await getCameraWatchEnabled();
  const camera = wantCamera
    ? await ParkTracker.requestCameraPermission()
    : false;

  await ParkTracker.start(await trackerOptions(true));

  let cameraStarted = false;
  if (camera) {
    try {
      await ParkTracker.startRuleWatch();
      cameraStarted = true;
    } catch (e) {
      console.warn(e);
    }
  }

  const notes: string[] = [];
  if (wantCamera && !cameraStarted) {
    notes.push(
      camera
        ? "カメラを起動できなかったため、カメラでの見守りなしで外出します。アプリを開き直すと再試行します。"
        : "カメラが許可されていないため、カメラでの見守りなしで外出します。",
    );
  }
  if (!p.notifications) {
    notes.push(
      "通知が許可されていないため、公園やルールのお知らせは表示されません。",
    );
  }
  if (!p.background) {
    notes.push(
      "位置情報が「常に許可」ではないため、スマホが記録を止めた後は、アプリを開くまで再開しません。",
    );
  }
  if (notes.length > 0)
    await alertAsync("外出を始めました", notes.join("\n\n"));
  return true;
}

export async function endOuting(): Promise<void> {
  try {
    await ParkTracker.stopRuleWatch();
  } catch (e) {
    console.warn(e);
  }
  await ParkTracker.stop();
}
let tokenChecked = false;
async function checkTokenOnce(): Promise<void> {
  if (tokenChecked) return;
  tokenChecked = true;
  try {
    await api.api.me.$get();
  } catch (e) {
    tokenChecked = false;
    console.warn(e);
  }
}

export async function ensureOuting(): Promise<void> {
  try {
    if (await ParkTracker.isEnabled()) await checkTokenOnce();
    await ParkTracker.ensureRunning(await trackerOptions());
  } catch (e) {
    console.warn(e);
    return;
  }
  try {
    const outing = await ParkTracker.getOutingStatus();
    if (!outing.active || !(await ParkTracker.isRunning())) return;
    const watch = await ParkTracker.getRuleWatchStatus();
    if (watch.running) return;
    if (!(await getCameraWatchEnabled())) return;
    if (!(await ParkTracker.hasCameraPermission())) return;
    await ParkTracker.startRuleWatch();
  } catch (e) {
    console.warn(e);
  }
}

export async function applyCameraWatchSetting(
  enabled: boolean,
): Promise<boolean> {
  if (!enabled) {
    await ParkTracker.stopRuleWatch().catch((e) => console.warn(e));
    return true;
  }
  const outing = await ParkTracker.getOutingStatus();
  if (!outing.active || !(await ParkTracker.isRunning())) return true;
  if ((await ParkTracker.getRuleWatchStatus()).running) return true;
  if (!(await ParkTracker.requestCameraPermission())) return false;
  await ParkTracker.startRuleWatch();
  return true;
}

async function syncTrackerConfig(): Promise<void> {
  try {
    if (!(await ParkTracker.isEnabled())) return;
    if (await ParkTracker.isRunning()) {
      await ParkTracker.start(await trackerOptions());
    }
    await ParkTracker.refreshParks();
  } catch (e) {
    console.warn(e);
  }
}

let configSync: Promise<void> = Promise.resolve();
function queueConfigSync() {
  configSync = configSync.then(syncTrackerConfig);
}
onLanguageChange(queueConfigSync);
onTokenChange(queueConfigSync);
