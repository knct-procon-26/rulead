import { Alert } from "react-native";
import * as ParkTracker from "@/modules/park-tracker";
import Debug from "@/constants/Debug";
import { api, getToken, onTokenChange } from "@/lib/client";
import { getT } from "@/lib/i18n";
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
    texts: { ...getT().native },
  };
}

function alertAsync(title: string, message: string): Promise<void> {
  return new Promise((resolve) =>
    Alert.alert(title, message, [{ text: getT().common.ok, onPress: () => resolve() }], {
      cancelable: false,
    }),
  );
}

export async function startOuting(): Promise<boolean> {
  const p = await ParkTracker.requestPermissions();
  const t = getT();
  if (p.location !== "precise") {
    Alert.alert(
      t.outing.preciseLocationTitle,
      t.outing.preciseLocationMessage,
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.common.openSettings,
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
      camera ? t.outing.cameraStartFailed : t.outing.cameraNotAllowed,
    );
  }
  if (!p.notifications) {
    notes.push(t.outing.notificationsNotAllowed);
  }
  if (!p.background) {
    notes.push(t.outing.backgroundNotAllowed);
  }
  if (notes.length > 0)
    await alertAsync(t.outing.startedTitle, notes.join("\n\n"));
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
