export type TrackerOptions = {
  /** 例: https://api.example.com/parks/nearby （?lat=..&lng=.. が付いて GET される） */
  apiUrl: string;
  /** 例: { Authorization: 'Bearer xxx' }。値は文字列のみ */
  headers?: Record<string, string>;
};

/** 公園の中にいる間に記録した位置（生の位置。丸めていない。精度50m以内のものだけ） */
export type TrackPoint = {
  time: number; // UNIX ミリ秒
  lat: number;
  lng: number;
  accuracy: number; // メートル
  parkIds: string[]; // そのとき中にいた公園（普通は1つ）
};

/** その日に初めて入った公園（1公園1日1件） */
export type Visit = {
  parkId: string;
  name: string;
  day: string; // 'YYYY-MM-DD'（端末のタイムゾーン）
  enteredAt: number; // UNIX ミリ秒
};

export type LocationEvent = {
  lat: number;
  lng: number;
  accuracy: number;
  time: number;
  insideParkIds: string[];
  /** 次の取得までの間隔（ミリ秒） */
  intervalMs: number;
};

/** firstToday: その日初めて入った（＝通知を出した）なら true */
export type EnterEvent = { parkId: string; name: string; time: number; firstToday: boolean };
export type ExitEvent = { parkId: string; time: number };
export type ErrorEvent = { message: string };

/** ネイティブから届くイベント（名前 → リスナーの型） */
export type ParkTrackerEvents = {
  ParkTrackerLocation: (e: LocationEvent) => void;
  ParkTrackerEnter: (e: EnterEvent) => void;
  ParkTrackerExit: (e: ExitEvent) => void;
  ParkTrackerError: (e: ErrorEvent) => void;
};

export type PermissionStatus = {
  /** precise: 正確な位置を許可 / approximate: おおよその位置のみ（公園の判定には使えない） */
  location: 'precise' | 'approximate' | 'denied' | 'blocked';
  /** 位置情報の「常に許可」。なくても動くが、OS に止められた後の自動再開ができない */
  background: boolean;
  /** 通知。なくても記録は動くが、入園の通知が出ない */
  notifications: boolean;
};
