import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';

import type {
  ParkTrackerEvents,
  PermissionStatus,
  TrackPoint,
  TrackerOptions,
  Visit,
} from './ParkTracker.types';
import Native from './ParkTrackerModule';

type NativeModuleType = NonNullable<typeof Native>;

function native(): NativeModuleType {
  if (!Native) {
    throw new Error(
      Platform.OS === 'android'
        ? 'ParkTracker ネイティブモジュールが見つかりません。Expo Go ではなく開発ビルド（npx expo run:android）で起動してください。'
        : 'ParkTracker は Android 専用です。',
    );
  }
  return Native;
}

// ---------------------------------------------------------------------------
// 権限
// ---------------------------------------------------------------------------

const P = PermissionsAndroid.PERMISSIONS;
const R = PermissionsAndroid.RESULTS;
const apiLevel = (): number => Number(Platform.Version);

/** 何も表示せずに現在の許可状態を調べる（画面の表示切り替え用） */
export async function getPermissionStatus(): Promise<PermissionStatus> {
  if (Platform.OS !== 'android') {
    return { location: 'denied', background: false, notifications: false };
  }
  const fine = await PermissionsAndroid.check(P.ACCESS_FINE_LOCATION);
  const coarse = fine || (await PermissionsAndroid.check(P.ACCESS_COARSE_LOCATION));
  const api = apiLevel();
  return {
    location: fine ? 'precise' : coarse ? 'approximate' : 'denied',
    background: api < 29 ? fine : await PermissionsAndroid.check(P.ACCESS_BACKGROUND_LOCATION),
    notifications: api < 33 ? true : await PermissionsAndroid.check(P.POST_NOTIFICATIONS),
  };
}

/**
 * 必要な権限を順番にリクエストする。ボタン押下など、画面を表示しているときに呼ぶ。
 * 順番: 位置（正確・使用中のみ）→ 通知 → 位置（常に許可）
 * Android 11 以降は「常に許可」をダイアログで直接選べないため、この順番でないと許可を得られない。
 *
 * options.background = false にすると「常に許可」は求めない。
 */
export async function requestPermissions(
  options: { background?: boolean } = {},
): Promise<PermissionStatus> {
  if (Platform.OS !== 'android') {
    return { location: 'denied', background: false, notifications: false };
  }
  const api = apiLevel();

  // 1. 位置（Android 12+ は FINE と COARSE を必ず一緒に求める。FINE だけだと無視される）
  const loc = await PermissionsAndroid.requestMultiple([
    P.ACCESS_FINE_LOCATION,
    P.ACCESS_COARSE_LOCATION,
  ]);
  const fine = loc[P.ACCESS_FINE_LOCATION];
  const coarse = loc[P.ACCESS_COARSE_LOCATION];
  if (fine !== R.GRANTED) {
    return {
      location:
        coarse === R.GRANTED ? 'approximate' : fine === R.NEVER_ASK_AGAIN ? 'blocked' : 'denied',
      background: false,
      notifications: false,
    };
  }

  // 2. 通知（Android 13+）。拒否されても記録は動く
  const notifications =
    api < 33 ? true : (await PermissionsAndroid.request(P.POST_NOTIFICATIONS)) === R.GRANTED;

  // 3. 常に許可（Android 10+）。Android 9 以下は 1 に含まれる
  let background = api < 29;
  if (!background) {
    background = await PermissionsAndroid.check(P.ACCESS_BACKGROUND_LOCATION);
    if (!background && options.background !== false) {
      // Google Play のポリシー上、求める前に理由をはっきり説明する必要がある
      await new Promise<void>((resolve) =>
        Alert.alert(
          '位置情報を「常に許可」にしてください',
          'アプリを閉じていても、近くの公園に入ったことをお知らせするために使います。' +
            (api >= 30 ? '次の画面で「常に許可」を選んでください。' : ''),
          [{ text: 'OK', onPress: () => resolve() }],
          { cancelable: false },
        ),
      );
      background =
        (await PermissionsAndroid.request(P.ACCESS_BACKGROUND_LOCATION)) === R.GRANTED;
    }
  }

  return { location: 'precise', background, notifications };
}

/** アプリの設定画面を開く（拒否され続けている権限をユーザーに直してもらう用） */
export function openAppSettings(): Promise<void> {
  return Linking.openSettings();
}

/** 電池の最適化の設定画面を開く */
export function openBatterySettings(): Promise<void> {
  return native().openBatterySettings();
}

// ---------------------------------------------------------------------------
// 開始・停止
// ---------------------------------------------------------------------------

/**
 * 記録を開始する。必ずアプリが画面に表示されているとき（ボタン押下など）に呼ぶ。
 * 動作中にもう一度呼ぶと、設定（apiUrl / headers）だけが差し替わる。トークン更新時にも使える。
 * サービスが実際に動き出すまで待ってから返る。
 * 失敗時のエラーコード（error.code）:
 *   E_CONFIG（apiUrl がない）/ E_PERMISSION（正確な位置の権限がない）/
 *   E_START（起動できない）/ E_NOT_STARTED（起動を依頼したが動き出さなかった）
 */
export async function start(options: TrackerOptions): Promise<void> {
  const m = native();
  await m.start(options);
  for (let i = 0; i < 30; i++) {
    if (await m.isRunning()) return;
    await new Promise<void>((r) => setTimeout(r, 100));
  }
  const err = new Error('位置情報サービスが起動しませんでした。権限の設定を確認してください。');
  (err as Error & { code: string }).code = 'E_NOT_STARTED';
  throw err;
}

/** 停止する。OS による自動再開もしなくなる。 */
export function stop(): Promise<void> {
  return native().stop();
}

/** サービスがいま動いているか */
export function isRunning(): Promise<boolean> {
  return Native ? Native.isRunning() : Promise.resolve(false);
}

/**
 * start() 済みで stop() されていないか（ユーザーが記録を望んでいるか）。
 * 端末の再起動やアプリの更新、OS による停止でサービスが止まっていても true のまま。
 */
export function isEnabled(): Promise<boolean> {
  return Native ? Native.isEnabled() : Promise.resolve(false);
}

/**
 * 「記録を望んでいるのに止まっている」ときだけ開始し直す。アプリが前面に来たとき（AppState が active）に呼ぶ。
 * 端末の再起動後やアプリの更新後、OS にサービスを止められた後の再開に使う。
 * 再開したら true。権限が足りないなどで開始できないときは start() と同じエラーを投げる。
 */
export async function ensureRunning(options: TrackerOptions): Promise<boolean> {
  if (!Native) return false;
  if (!(await Native.isEnabled()) || (await Native.isRunning())) return false;
  await start(options);
  return true;
}

// ---------------------------------------------------------------------------
// 保存したデータ
// ---------------------------------------------------------------------------

/** その日の 0:00（端末のタイムゾーン）の UNIX ミリ秒 */
export function startOfDay(date: Date = new Date()): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** 公園内で記録した位置。from 以上 to 未満（UNIX ミリ秒）、時刻順 */
export function getTrack(from: number, to: number = Date.now() + 1): Promise<TrackPoint[]> {
  return native().getTrack(from, to);
}

/** before より古い位置の記録を削除し、削除件数を返す */
export function clearTrack(before: number): Promise<number> {
  return native().clearTrack(before);
}

/** その日初めて入った公園の履歴。入園時刻が from 以上 to 未満、時刻順 */
export function getVisits(from: number, to: number = Date.now() + 1): Promise<Visit[]> {
  return native().getVisits(from, to);
}

/** before より古い履歴を削除し、削除件数を返す（削除しても今日の再通知は起きない） */
export function clearVisits(before: number): Promise<number> {
  return native().clearVisits(before);
}

// ---------------------------------------------------------------------------
// イベント
// ---------------------------------------------------------------------------

/**
 * ネイティブからのイベントを受け取る。
 * JS が動いているとき（アプリが生きているとき）だけ届く。通知と記録はこれが無くても行われるので、
 * アプリを開いたときは getVisits / getTrack で取りこぼしを読み直すこと。
 */
export function addListener<K extends keyof ParkTrackerEvents>(
  event: K,
  listener: ParkTrackerEvents[K],
): { remove(): void } {
  if (!Native) return { remove() {} };
  return Native.addListener(event, listener);
}
