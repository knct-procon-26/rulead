import type * as MediaLibraryLegacy from "expo-media-library/legacy";

type Lib = typeof MediaLibraryLegacy;

let cached: Lib | null | undefined;

function lib(): Lib | null {
  if (cached !== undefined) return cached;
  try {
    cached = require("expo-media-library/legacy") as Lib;
  } catch {
    cached = null;
  }
  return cached;
}

export type PhotoAccess =
  | "granted"
  | "limited"
  | "undetermined"
  | "denied"
  | "blocked"
  | "unavailable";

function toAccess(r: MediaLibraryLegacy.PermissionResponse): PhotoAccess {
  if (r.granted)
    return r.accessPrivileges === "limited" ? "limited" : "granted";
  if (r.status === "undetermined") return "undetermined";
  return r.canAskAgain ? "denied" : "blocked";
}

export async function getPhotoAccess(): Promise<PhotoAccess> {
  const m = lib();
  if (!m) return "unavailable";
  try {
    return toAccess(await m.getPermissionsAsync(false, ["photo"]));
  } catch {
    return "unavailable";
  }
}

export async function requestPhotoAccess(): Promise<PhotoAccess> {
  const m = lib();
  if (!m) return "unavailable";
  try {
    return toAccess(await m.requestPermissionsAsync(false, ["photo"]));
  } catch {
    return "unavailable";
  }
}

export async function reselectPhotos(): Promise<void> {
  const m = lib();
  if (!m) return;
  try {
    await m.presentPermissionsPickerAsync(["photo"]);
  } catch {
    // 選び直しに対応していない端末では何もしない
  }
}

export type Photo = {
  id: string;
  uri: string;
  width: number;
  height: number;
  takenAt: number;
};

const MAX_PER_WINDOW = 200;

export async function findPhotos(
  windows: { start: number; end: number }[],
): Promise<Photo[]> {
  const m = lib();
  if (!m || windows.length === 0) return [];
  const seen = new Set<string>();
  const out: Photo[] = [];
  for (const w of windows) {
    if (!(w.end > w.start)) continue;
    const page = await m.getAssetsAsync({
      mediaType: m.MediaType.photo,
      createdAfter: w.start,
      createdBefore: w.end,
      sortBy: [[m.SortBy.creationTime, true]],
      first: MAX_PER_WINDOW,
    });
    for (const a of page.assets) {
      if (seen.has(a.id)) continue;

      if (!(a.creationTime >= w.start && a.creationTime <= w.end)) continue;
      seen.add(a.id);
      out.push({
        id: a.id,
        uri: a.uri,
        width: a.width,
        height: a.height,
        takenAt: a.creationTime,
      });
    }
  }
  return out.sort((a, b) => a.takenAt - b.takenAt);
}
