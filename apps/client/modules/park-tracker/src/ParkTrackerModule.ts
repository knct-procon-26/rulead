import { NativeModule, requireOptionalNativeModule } from "expo";

import type {
  CurrentPark,
  OutingStatus,
  ParkTrackerEvents,
  RuleAlert,
  RuleWatchStatus,
  Sighting,
  TrackPoint,
  TrackerOptions,
  Visit,
} from "./ParkTracker.types";

export type NativeParkDetails = {
  parkId: string;
  name: string;
  address: string;
  rulesJson: string;
  fetchedAt: number;
};

export type NativeVisitedPark = {
  parkId: string;
  name: string;
  address: string;
  geometryJson: string;
  updatedAt: number;
};

declare class ParkTrackerNativeModule extends NativeModule<ParkTrackerEvents> {
  start(options: TrackerOptions): Promise<void>;
  stop(): Promise<void>;
  isRunning(): Promise<boolean>;
  isEnabled(): Promise<boolean>;
  getCurrentParks(): Promise<CurrentPark[]>;
  getParkDetails(parkId: string): Promise<NativeParkDetails | null>;

  getVisitedPark?(parkId: string): Promise<NativeVisitedPark | null>;
  refreshParks(): Promise<void>;
  getTrack(from: number, to: number): Promise<TrackPoint[]>;
  clearTrack(before: number): Promise<number>;
  getVisits(from: number, to: number): Promise<Visit[]>;
  clearVisits(before: number): Promise<number>;
  resetEnterNotifications?(): Promise<number>;
  openBatterySettings(): Promise<void>;

  getOutingStatus(): Promise<OutingStatus>;

  startRuleWatch(debugConfigJson: string): Promise<void>;
  stopRuleWatch(): Promise<void>;
  getRuleWatchStatus(): Promise<RuleWatchStatus>;
  getSightings(from: number, to: number): Promise<Sighting[]>;
  clearSightings(before: number): Promise<number>;
  getRuleAlerts(from: number, to: number): Promise<RuleAlert[]>;
  clearRuleAlerts(before: number): Promise<number>;
}

export default requireOptionalNativeModule<ParkTrackerNativeModule>(
  "ParkTracker",
);
