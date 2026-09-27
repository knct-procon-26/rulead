import { Alert, Linking, PermissionsAndroid, Platform } from "react-native";

import type {
  CurrentPark,
  OutingStatus,
  ParkDetails,
  ParkRule,
  ParkTrackerEvents,
  PermissionStatus,
  RuleAlert,
  RuleWatchDebugPark,
  RuleWatchStatus,
  Sighting,
  TrackPoint,
  TrackerOptions,
  Visit,
  VisitedPark,
  GeoPoint,
  ParkPolygon,
} from "./ParkTracker.types";
import Native from "./ParkTrackerModule";

type NativeModuleType = NonNullable<typeof Native>;

function native(): NativeModuleType {
  if (!Native) {
    throw new Error(
      Platform.OS === "android"
        ? "ParkTracker ネイティブモジュールが見つかりません。Expo Go ではなく開発ビルド（npx expo run:android）で起動してください。"
        : "ParkTracker は Android 専用です。",
    );
  }
  return Native;
}

function codedError(code: string, message: string): Error & { code: string } {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const P = PermissionsAndroid.PERMISSIONS;
const R = PermissionsAndroid.RESULTS;
const apiLevel = (): number => Number(Platform.Version);

export async function getPermissionStatus(): Promise<PermissionStatus> {
  if (Platform.OS !== "android") {
    return { location: "denied", background: false, notifications: false };
  }
  const fine = await PermissionsAndroid.check(P.ACCESS_FINE_LOCATION);
  const coarse =
    fine || (await PermissionsAndroid.check(P.ACCESS_COARSE_LOCATION));
  const api = apiLevel();
  return {
    location: fine ? "precise" : coarse ? "approximate" : "denied",
    background:
      api < 29
        ? fine
        : await PermissionsAndroid.check(P.ACCESS_BACKGROUND_LOCATION),
    notifications:
      api < 33 ? true : await PermissionsAndroid.check(P.POST_NOTIFICATIONS),
  };
}

export async function requestPermissions(
  options: { background?: boolean } = {},
): Promise<PermissionStatus> {
  if (Platform.OS !== "android") {
    return { location: "denied", background: false, notifications: false };
  }
  const api = apiLevel();

  const loc = await PermissionsAndroid.requestMultiple([
    P.ACCESS_FINE_LOCATION,
    P.ACCESS_COARSE_LOCATION,
  ]);
  const fine = loc[P.ACCESS_FINE_LOCATION];
  const coarse = loc[P.ACCESS_COARSE_LOCATION];
  if (fine !== R.GRANTED) {
    return {
      location:
        coarse === R.GRANTED
          ? "approximate"
          : fine === R.NEVER_ASK_AGAIN
            ? "blocked"
            : "denied",
      background: false,
      notifications: false,
    };
  }

  const notifications =
    api < 33
      ? true
      : (await PermissionsAndroid.request(P.POST_NOTIFICATIONS)) === R.GRANTED;

  let background = api < 29;
  if (!background) {
    background = await PermissionsAndroid.check(P.ACCESS_BACKGROUND_LOCATION);
    if (!background && options.background !== false) {
      await new Promise<void>((resolve) =>
        Alert.alert(
          "位置情報を「常に許可」にしてください",
          "アプリを閉じていても、近くの公園に入ったことをお知らせするために使います。" +
            (api >= 30 ? "次の画面で「常に許可」を選んでください。" : ""),
          [{ text: "OK", onPress: () => resolve() }],
          { cancelable: false },
        ),
      );
      background =
        (await PermissionsAndroid.request(P.ACCESS_BACKGROUND_LOCATION)) ===
        R.GRANTED;
    }
  }

  return { location: "precise", background, notifications };
}

export async function hasCameraPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  return PermissionsAndroid.check(P.CAMERA);
}

export async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  if (await PermissionsAndroid.check(P.CAMERA)) return true;
  return (await PermissionsAndroid.request(P.CAMERA)) === R.GRANTED;
}

export function openAppSettings(): Promise<void> {
  return Linking.openSettings();
}

export function openBatterySettings(): Promise<void> {
  return native().openBatterySettings();
}

export async function start(options: TrackerOptions): Promise<void> {
  const m = native();
  await m.start(options);
  for (let i = 0; i < 30; i++) {
    if (await m.isRunning()) return;
    await sleep(100);
  }
  throw codedError(
    "E_NOT_STARTED",
    "位置情報サービスが起動しませんでした。権限の設定を確認してください。",
  );
}

export function stop(): Promise<void> {
  return native().stop();
}

export function isRunning(): Promise<boolean> {
  return Native ? Native.isRunning() : Promise.resolve(false);
}

export function isEnabled(): Promise<boolean> {
  return Native ? Native.isEnabled() : Promise.resolve(false);
}

export async function ensureRunning(options: TrackerOptions): Promise<boolean> {
  if (!Native) return false;
  if (!(await Native.isEnabled()) || (await Native.isRunning())) return false;
  await start(options);
  return true;
}

export function getCurrentParks(): Promise<CurrentPark[]> {
  return Native ? Native.getCurrentParks() : Promise.resolve([]);
}
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export function parseRules(json: string): ParkRule[] {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const rules: ParkRule[] = [];
  const seen = new Set<string>();
  for (const r of data) {
    if (!isObj(r) || typeof r.id !== "string" || r.id === "" || seen.has(r.id))
      continue;
    if (typeof r.text !== "string" || typeof r.iconName !== "string") continue;
    seen.add(r.id);
    const iconType: ParkRule["iconType"] =
      r.iconType === "prohibition"
        ? "prohibition"
        : r.iconType === "caution"
          ? "caution"
          : "information";
    const keywords = Array.isArray(r.keywords)
      ? r.keywords.flatMap((k) =>
          isObj(k) && typeof k.label === "string"
            ? [
                {
                  id: typeof k.id === "number" ? k.id : -1,
                  label: k.label,
                  index:
                    typeof k.index === "number" && Number.isInteger(k.index)
                      ? k.index
                      : -1,
                },
              ]
            : [],
        )
      : [];
    rules.push({
      id: r.id,
      text: r.text,
      iconId: typeof r.iconId === "number" ? r.iconId : 0,
      iconName: r.iconName,
      iconType,
      keywords,
    });
  }
  return rules;
}

export async function getParkDetails(
  parkId: string,
): Promise<ParkDetails | null> {
  if (!Native) return null;
  const d = await Native.getParkDetails(String(parkId));
  if (!d) return null;
  return {
    parkId: d.parkId,
    name: d.name,
    address: d.address,
    rules: parseRules(d.rulesJson),
    fetchedAt: d.fetchedAt,
  };
}

function parseRing(ring: unknown): GeoPoint[] | null {
  if (!Array.isArray(ring)) return null;
  const out: GeoPoint[] = [];
  for (const pt of ring) {
    if (!Array.isArray(pt) || pt.length < 2) continue;
    const [lng, lat] = pt;
    if (
      typeof lng !== "number" ||
      typeof lat !== "number" ||
      !Number.isFinite(lng) ||
      !Number.isFinite(lat) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    )
      continue;
    out.push({ latitude: lat, longitude: lng });
  }
  return out.length >= 3 ? out : null;
}

function parsePolygonCoords(rings: unknown): ParkPolygon | null {
  if (!Array.isArray(rings) || rings.length === 0) return null;
  const outer = parseRing(rings[0]);
  if (!outer) return null;
  const holes: GeoPoint[][] = [];
  for (let i = 1; i < rings.length; i++) {
    const h = parseRing(rings[i]);
    if (h) holes.push(h);
  }
  return { outer, holes };
}

export function parseGeometry(json: string): ParkPolygon[] {
  let g: unknown;
  try {
    g = JSON.parse(json);
  } catch {
    return [];
  }
  if (!isObj(g) || !Array.isArray(g.coordinates)) return [];
  if (g.type === "Polygon") {
    const p = parsePolygonCoords(g.coordinates);
    return p ? [p] : [];
  }
  if (g.type === "MultiPolygon") {
    const out: ParkPolygon[] = [];
    for (const rings of g.coordinates) {
      const p = parsePolygonCoords(rings);
      if (p) out.push(p);
    }
    return out;
  }
  return [];
}

export async function getVisitedPark(
  parkId: string,
): Promise<VisitedPark | null> {
  if (!Native || typeof Native.getVisitedPark !== "function") return null;
  const p = await Native.getVisitedPark(String(parkId));
  if (!p) return null;
  return {
    parkId: p.parkId,
    name: p.name,
    address: p.address,
    polygons: parseGeometry(p.geometryJson),
    updatedAt: p.updatedAt,
  };
}

export function resetEnterNotifications(): Promise<number> {
  const n = native();
  if (typeof n.resetEnterNotifications !== "function") {
    return Promise.reject(
      new Error("このビルドは入園通知のリセットに対応していません"),
    );
  }
  return n.resetEnterNotifications();
}

export function refreshParks(): Promise<void> {
  return Native ? Native.refreshParks() : Promise.resolve();
}

export function startOfDay(date: Date = new Date()): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function getTrack(
  from: number,
  to: number = Date.now() + 1,
): Promise<TrackPoint[]> {
  return native().getTrack(from, to);
}

export function clearTrack(before: number): Promise<number> {
  return native().clearTrack(before);
}

export function getVisits(
  from: number,
  to: number = Date.now() + 1,
): Promise<Visit[]> {
  return native().getVisits(from, to);
}

export function clearVisits(before: number): Promise<number> {
  return native().clearVisits(before);
}

export async function startRuleWatch(
  options: { debugPark?: RuleWatchDebugPark } = {},
): Promise<void> {
  const m = native();
  const debug = options.debugPark;
  const json = debug
    ? JSON.stringify({
        parkId: String(debug.parkId),
        parkName: debug.parkName ?? "",
        rules: debug.rules.map((r) => ({
          id: r.id,
          text: r.text,
          keywords: r.keywords.map((k) => ({ index: k.index, label: k.label })),
        })),
      })
    : "";
  await m.startRuleWatch(json);
  for (let i = 0; i < 30; i++) {
    const s = await m.getRuleWatchStatus();
    if (s.running && s.debug === (debug !== undefined)) return;
    await sleep(100);
  }
  throw codedError(
    "E_NOT_STARTED",
    "カメラでの見守りが起動しませんでした。カメラの権限と、他のアプリがカメラを使っていないかを確認してください。",
  );
}

export function stopRuleWatch(): Promise<void> {
  return Native ? Native.stopRuleWatch() : Promise.resolve();
}

export function getRuleWatchStatus(): Promise<RuleWatchStatus> {
  return Native
    ? Native.getRuleWatchStatus()
    : Promise.resolve({
        running: false,
        cameraActive: false,
        parkId: null,
        parkName: null,
        debug: false,
      });
}

export function getOutingStatus(): Promise<OutingStatus> {
  return Native
    ? Native.getOutingStatus()
    : Promise.resolve({
        active: false,
        startedAt: null,
        homeSet: false,
        leftHome: false,
      });
}

export function getSightings(
  from: number,
  to: number = Date.now() + 1,
): Promise<Sighting[]> {
  return native().getSightings(from, to);
}

export function clearSightings(before: number): Promise<number> {
  return native().clearSightings(before);
}

export function getRuleAlerts(
  from: number,
  to: number = Date.now() + 1,
): Promise<RuleAlert[]> {
  return native().getRuleAlerts(from, to);
}

export function clearRuleAlerts(before: number): Promise<number> {
  return native().clearRuleAlerts(before);
}

export function addListener<K extends keyof ParkTrackerEvents>(
  event: K,
  listener: ParkTrackerEvents[K],
): { remove(): void } {
  if (!Native) return { remove() {} };
  return Native.addListener(event, listener);
}
