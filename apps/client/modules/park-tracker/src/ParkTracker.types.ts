export type TrackerOptions = {
  apiUrl: string;

  headers?: Record<string, string>;

  outing?: boolean;

  texts?: Record<string, string>;
};

export type OutingStatus = {
  active: boolean;
  startedAt: number | null;

  homeSet: boolean;

  leftHome: boolean;
};

export type TrackPoint = {
  time: number;
  lat: number;
  lng: number;
  accuracy: number;
  parkIds: string[];
};

export type Visit = {
  parkId: string;
  name: string;
  day: string;
  enteredAt: number;
};

export type CurrentPark = {
  parkId: string;
  name: string;
  enteredAt: number;
};

export type ParkRule = {
  id: string;
  text: string;
  iconId: number;
  iconName: string;
  iconType: "prohibition" | "caution" | "information";

  keywords: { id: number; label: string; index: number }[];
};

export type ParkDetails = {
  parkId: string;
  name: string;
  address: string;
  rules: ParkRule[];
  fetchedAt: number;
};

export type GeoPoint = { latitude: number; longitude: number };

export type ParkPolygon = { outer: GeoPoint[]; holes: GeoPoint[][] };

export type VisitedPark = {
  parkId: string;
  name: string;
  address: string;
  polygons: ParkPolygon[];
  updatedAt: number;
};

export type WatchKeyword = { index: number; label: string };

export type WatchRule = { id: string; text: string; keywords: WatchKeyword[] };

export type RuleWatchDebugPark = {
  parkId: string;
  parkName: string;
  rules: WatchRule[];
};

export type RuleWatchStatus = {
  running: boolean;

  cameraActive: boolean;
  parkId: string | null;
  parkName: string | null;

  debug: boolean;
};

export type Sighting = {
  parkId: string;
  parkName: string;
  day: string;
  labelIndex: number;
  label: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  maxConfidence: number;
};

export type RuleAlert = {
  parkId: string;
  parkName: string;
  ruleId: string;
  ruleText: string;
  labelIndex: number;
  label: string;
  confidence: number;
  time: number;
};

export type LocationEvent = {
  lat: number;
  lng: number;
  accuracy: number;
  time: number;
  insideParkIds: string[];

  intervalMs: number;
};

export type EnterEvent = {
  parkId: string;
  name: string;
  time: number;
  firstToday: boolean;
};
export type ExitEvent = { parkId: string; time: number };
export type ErrorEvent = { message: string };

export type RuleWatchLabelsEvent = {
  parkId: string;
  time: number;
  labels: { index: number; label: string; confidence: number }[];
};
export type RuleWatchAlertEvent = RuleAlert;
export type RuleWatchStopReason =
  | "user"
  | "tracker_stopped"
  | "timeout"
  | "error"
  | "stopped";
export type RuleWatchStoppedEvent = { reason: RuleWatchStopReason };

export type OutingEndedEvent = { reason: "returned"; time: number };

export type DeviceRotation = 0 | 90 | 180 | 270;
export type DeviceOrientationEvent = { degrees: DeviceRotation };

export type ParkTrackerEvents = {
  ParkTrackerLocation: (e: LocationEvent) => void;
  ParkTrackerEnter: (e: EnterEvent) => void;
  ParkTrackerExit: (e: ExitEvent) => void;
  ParkTrackerError: (e: ErrorEvent) => void;
  ParkTrackerOutingEnded: (e: OutingEndedEvent) => void;
  RuleWatchLabels: (e: RuleWatchLabelsEvent) => void;
  RuleWatchAlert: (e: RuleWatchAlertEvent) => void;
  RuleWatchStopped: (e: RuleWatchStoppedEvent) => void;
  DeviceOrientation: (e: DeviceOrientationEvent) => void;
};

export type PermissionStatus = {
  location: "precise" | "approximate" | "denied" | "blocked";

  background: boolean;

  notifications: boolean;
};
