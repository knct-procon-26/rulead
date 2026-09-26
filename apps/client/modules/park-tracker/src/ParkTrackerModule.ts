import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { ParkTrackerEvents, TrackPoint, TrackerOptions, Visit } from './ParkTracker.types';

/** Kotlin の ParkTrackerModule（Name("ParkTracker")）の型 */
declare class ParkTrackerNativeModule extends NativeModule<ParkTrackerEvents> {
  start(options: TrackerOptions): Promise<void>;
  stop(): Promise<void>;
  isRunning(): Promise<boolean>;
  isEnabled(): Promise<boolean>;
  getTrack(from: number, to: number): Promise<TrackPoint[]>;
  clearTrack(before: number): Promise<number>;
  getVisits(from: number, to: number): Promise<Visit[]>;
  clearVisits(before: number): Promise<number>;
  openBatterySettings(): Promise<void>;
}

/**
 * Android 専用モジュール。iOS / Web では null になる（import しただけでは落ちない）。
 * Expo Go にはこのモジュールが入っていないので、開発ビルド（npx expo run:android / EAS Build）で動かすこと。
 */
export default requireOptionalNativeModule<ParkTrackerNativeModule>('ParkTracker');
