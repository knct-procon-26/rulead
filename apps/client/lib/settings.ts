import { useSyncExternalStore } from "react";
import * as SecureStore from "expo-secure-store";

const CAMERA_WATCH_KEY = "camera_watch";

let cameraWatch = true;
let changedBeforeLoad = false;
const listeners = new Set<() => void>();

function apply(v: boolean) {
  if (v === cameraWatch) return;
  cameraWatch = v;
  listeners.forEach((l) => l());
}

const loaded: Promise<void> = SecureStore.getItemAsync(CAMERA_WATCH_KEY)
  .then((saved) => {
    if (!changedBeforeLoad && (saved === "0" || saved === "1")) {
      apply(saved === "1");
    }
  })
  .catch((e) => console.warn(e));

export async function getCameraWatchEnabled(): Promise<boolean> {
  await loaded;
  return cameraWatch;
}

export function setCameraWatchEnabled(v: boolean) {
  changedBeforeLoad = true;
  apply(v);
  SecureStore.setItemAsync(CAMERA_WATCH_KEY, v ? "1" : "0").catch((e) =>
    console.warn(e),
  );
}

export function onCameraWatchChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useCameraWatchEnabled(): boolean {
  return useSyncExternalStore(
    onCameraWatchChange,
    () => cameraWatch,
    () => cameraWatch,
  );
}
