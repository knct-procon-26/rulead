import { api } from "@/lib/client";
import {
  getCurrentLocation,
  reverseGeocode,
  type NearbyGeocodeArea,
} from "@/lib/utility";
import { formatDistance } from "@/lib/nearbySearch";
import { getT, useT } from "@/lib/i18n";
import Colors from "@/constants/Colors";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, {
  Circle,
  LatLng,
  Marker,
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  areaM2,
  closeRing,
  containsPoint,
  distanceToRingM,
  isSimpleRing,
} from "./polygon";

type Props = {
  onLocationDecided: (area: Area) => void;
  end: (message?: string) => Promise<void>;
};

export type Area = {
  geometry: LatLng[];
  name: string;
  address: string;
  parkId?: number;
};

type Candidate = {
  source: "registered" | "osm";
  parkId?: number;
  name: string;
  address: string;
  geometry: LatLng[];
};

type RegisteredPark = {
  id: number;
  name: string;
  address: string;
  geometry: LatLng[];
};

type Vertex = LatLng & { id: number };

type Suggestion = Candidate & { key: string; distanceM: number };

type Step = "candidate" | "suggest" | "manual";

const MAX_MANUAL_POINTS = 30;
const MAX_MANUAL_AREA_M2 = 100_000; // 10ha
const MIN_MANUAL_AREA_M2 = 20;
const MAX_DISTANCE_FROM_HERE_M = 100;
const MAX_NAME_LENGTH = 100;
const NEARBY_SUGGEST_M = 60;
const MAX_SUGGESTIONS = 3;
const SAME_SHAPE_TOLERANCE_M = 5;

const LOOKUP_TIMEOUT_MS = 15_000;
const INITIAL_DELTA = 0.004;
const FIT_PADDING = { top: 48, right: 48, bottom: 48, left: 48 };

const VERTEX_COLOR = "#f08c00";
const HERE_COLOR = "#1c7ed6";
const HERE_DOT_RADIUS_M = 5;
const HERE_HALO_RADIUS_M = 15;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseNearbyParks(body: unknown): RegisteredPark[] {
  if (!isRecord(body) || !Array.isArray(body.features)) return [];
  const parks: RegisteredPark[] = [];
  for (const f of body.features) {
    if (!isRecord(f)) continue;
    const id = typeof f.id === "number" ? f.id : Number(f.id);
    if (!Number.isInteger(id)) continue;
    const props = isRecord(f.properties) ? f.properties : {};
    const geometry = isRecord(f.geometry) ? f.geometry : null;
    if (
      !geometry ||
      geometry.type !== "Polygon" ||
      !Array.isArray(geometry.coordinates) ||
      !Array.isArray(geometry.coordinates[0])
    ) {
      continue;
    }
    const ring: LatLng[] = [];
    for (const c of geometry.coordinates[0] as unknown[]) {
      if (
        Array.isArray(c) &&
        typeof c[0] === "number" &&
        typeof c[1] === "number"
      ) {
        ring.push({ latitude: c[1], longitude: c[0] });
      }
    }
    if (ring.length < 4) continue;
    parks.push({
      id,
      name: typeof props.name === "string" ? props.name : "",
      address: typeof props.address === "string" ? props.address : "",
      geometry: ring,
    });
  }
  return parks;
}

async function fetchRegisteredParks(here: LatLng): Promise<RegisteredPark[]> {
  const res = await api.api.parks.nearby.$get({
    query: { lat: String(here.latitude), lng: String(here.longitude) },
  });
  if (!res.ok) throw new Error(`parks/nearby error: ${res.status}`);
  const body: unknown = await res.json();
  return parseNearbyParks(body);
}

function pickCandidate(
  here: LatLng,
  registered: RegisteredPark[],
  osmAreas: { name: string; geometry: LatLng[] }[],
  address: string,
): Candidate | null {
  const park = registered
    .filter((p) => containsPoint(p.geometry, here))
    .sort((a, b) => areaM2(a.geometry) - areaM2(b.geometry))[0];
  if (park) {
    return {
      source: "registered",
      parkId: park.id,
      name: park.name,
      address: park.address !== "" ? park.address : address,
      geometry: park.geometry,
    };
  }
  const osm = osmAreas.find((a) => a.geometry.length >= 4);
  if (osm) {
    return {
      source: "osm",
      name: osm.name,
      address,
      geometry: osm.geometry,
    };
  }
  return null;
}

function normalizeName(name: string): string {
  return name.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
}

function sameShape(a: LatLng[], b: LatLng[]): boolean {
  const pts = a.slice(0, -1).slice(0, 30);
  if (pts.length === 0) return false;
  let near = 0;
  for (const v of pts) {
    if (distanceToRingM(b, v) <= SAME_SHAPE_TOLERANCE_M) near++;
  }
  return near >= pts.length * 0.8;
}

function pickSuggestions(
  here: LatLng,
  registered: RegisteredPark[],
  nearbyAreas: NearbyGeocodeArea[],
  address: string,
): Suggestion[] {
  const list: Suggestion[] = [];
  for (const p of registered) {
    const d = distanceToRingM(p.geometry, here);
    if (!(d > 0 && d <= NEARBY_SUGGEST_M)) continue;
    list.push({
      key: `p${p.id}`,
      source: "registered",
      parkId: p.id,
      name: p.name,
      address: p.address !== "" ? p.address : address,
      geometry: p.geometry,
      distanceM: d,
    });
  }
  const registeredNames = new Set(
    list.map((s) => normalizeName(s.name)).filter((n) => n !== ""),
  );
  const seenOsm = new Set<string>();
  for (const a of nearbyAreas) {
    if (
      a.geometry.length < 4 ||
      !Number.isFinite(a.distanceM) ||
      a.distanceM > NEARBY_SUGGEST_M ||
      seenOsm.has(a.osmId)
    ) {
      continue;
    }
    seenOsm.add(a.osmId);
    const n = normalizeName(a.name);
    if (n !== "" && registeredNames.has(n)) continue;
    if (
      list.some(
        (s) => s.source === "registered" && sameShape(a.geometry, s.geometry),
      )
    ) {
      continue;
    }
    list.push({
      key: `o${a.osmId}`,
      source: "osm",
      name: a.name,
      address,
      geometry: a.geometry,
      distanceM: a.distanceM,
    });
  }
  return list
    .sort((x, y) => x.distanceM - y.distanceM)
    .slice(0, MAX_SUGGESTIONS);
}

type IssueKind = "needPoints" | "crossing" | "tooSmall" | "tooLarge" | "tooFar";
type Issue = { kind: IssueKind; isError: boolean };

function manualIssue(vertices: Vertex[], here: LatLng): Issue | null {
  if (vertices.length < 3) {
    return { kind: "needPoints", isError: false };
  }
  if (!isSimpleRing(vertices)) {
    return { kind: "crossing", isError: true };
  }
  const area = areaM2(vertices);
  if (area < MIN_MANUAL_AREA_M2) {
    return { kind: "tooSmall", isError: true };
  }
  if (area > MAX_MANUAL_AREA_M2) {
    return { kind: "tooLarge", isError: true };
  }
  if (distanceToRingM(vertices, here) > MAX_DISTANCE_FROM_HERE_M) {
    return { kind: "tooFar", isError: true };
  }
  return null;
}

export default function Map({ onLocationDecided, end }: Props) {
  const mapRef = useRef<MapView | null>(null);
  const mountedRef = useRef(true);
  const lookupIdRef = useRef(0);
  const nextVertexIdRef = useRef(0);

  const [location, setLocation] = useState<LatLng | null>(null);
  const [searching, setSearching] = useState(false);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [address, setAddress] = useState("");
  const [step, setStep] = useState<Step>("candidate");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [vertices, setVertices] = useState<Vertex[]>([]);
  const [name, setName] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const t = useT();
  const insets = useSafeAreaInsets();
  const manual = step === "manual";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const here = await getCurrentLocation();
        if (mountedRef.current) setLocation(here);
      } catch {
        if (mountedRef.current) await end(getT().scanMap.locationFailed);
      }
    })();
  }, []);

  useEffect(() => {
    if (!location) return;
    const lookupId = ++lookupIdRef.current;
    setSearching(true);
    (async () => {
      const [geo, registered] = await Promise.allSettled([
        withTimeout(
          reverseGeocode(location.latitude, location.longitude),
          LOOKUP_TIMEOUT_MS,
        ),
        withTimeout(fetchRegisteredParks(location), LOOKUP_TIMEOUT_MS),
      ]);
      if (!mountedRef.current || lookupId !== lookupIdRef.current) return;
      if (geo.status === "rejected") {
        console.warn("areas lookup failed", geo.reason);
      }
      if (registered.status === "rejected") {
        console.warn("parks lookup failed", registered.reason);
      }

      const addr = geo.status === "fulfilled" ? geo.value.address : "";
      const registeredParks =
        registered.status === "fulfilled" ? registered.value : [];
      const next = pickCandidate(
        location,
        registeredParks,
        geo.status === "fulfilled" ? geo.value.areas : [],
        addr,
      );
      const nextSuggestions =
        next === null
          ? pickSuggestions(
              location,
              registeredParks,
              geo.status === "fulfilled" ? geo.value.nearbyAreas : [],
              addr,
            )
          : [];

      setAddress(addr);
      setCandidate(next);
      setSuggestions(nextSuggestions);
      setStep(
        next !== null
          ? "candidate"
          : nextSuggestions.length > 0
            ? "suggest"
            : "manual",
      );
      setLookupFailed(geo.status === "rejected");
      setSearching(false);
    })();
  }, [location]);

  useEffect(() => {
    if (!mapReady || !location) return;
    let coords: LatLng[] | null = null;
    if (step === "candidate" && candidate) {
      coords = candidate.geometry;
    } else if (step === "suggest" && suggestions.length > 0) {
      coords = [location, ...suggestions.flatMap((s) => s.geometry)];
    }
    if (!coords) return;
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: FIT_PADDING,
      animated: true,
    });
  }, [mapReady, location, step, candidate, suggestions]);

  const issue = useMemo(
    () => (location ? manualIssue(vertices, location) : null),
    [vertices, location],
  );

  if (!location) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.tint} />
        <Text style={styles.subText}>{t.scanMap.locating}</Text>
      </View>
    );
  }

  const canSubmit =
    !searching &&
    (manual ? issue === null : step === "candidate" && candidate !== null);

  const pickSuggestion = (s: Suggestion) => {
    setCandidate(s);
    setStep("candidate");
  };

  const backToSuggestions = () => {
    setCandidate(null);
    setStep("suggest");
  };

  const drawOwn = () => {
    setCandidate(null);
    setStep("manual");
  };

  const guide: { text: string; tone: "todo" | "error" | "ok" } | null = !manual
    ? null
    : vertices.length < 3
      ? { text: t.scanMap.guideTap(3 - vertices.length), tone: "todo" }
      : issue
        ? { text: t.scanMap.issues[issue.kind], tone: "error" }
        : { text: t.scanMap.readyToSubmit, tone: "ok" };

  const addVertex = (c: LatLng) => {
    setVertices((prev) =>
      prev.length >= MAX_MANUAL_POINTS
        ? prev
        : [
            ...prev,
            {
              latitude: c.latitude,
              longitude: c.longitude,
              id: nextVertexIdRef.current++,
            },
          ],
    );
  };

  const moveVertex = (id: number, c: LatLng) => {
    setVertices((prev) =>
      prev.map((v) =>
        v.id === id
          ? { ...v, latitude: c.latitude, longitude: c.longitude }
          : v,
      ),
    );
  };

  const removeVertex = (id: number) => {
    setVertices((prev) => prev.filter((v) => v.id !== id));
  };

  const submit = () => {
    if (!canSubmit) return;
    if (manual) {
      onLocationDecided({
        geometry: closeRing(vertices),
        name: name.trim(),
        address,
      });
      return;
    }
    if (step !== "candidate" || !candidate) return;
    onLocationDecided({
      geometry: candidate.geometry,
      name: candidate.name,
      address: candidate.address,
      parkId: candidate.parkId,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={insets.top}
    >
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: INITIAL_DELTA,
            longitudeDelta: INITIAL_DELTA,
          }}
          showsCompass
          toolbarEnabled={false}
          moveOnMarkerPress={false}
          onMapReady={() => setMapReady(true)}
          onPress={(e) => {
            if (!manual) return;
            const ev = e.nativeEvent;
            if ("action" in ev && ev.action === "marker-press") return;
            addVertex(ev.coordinate);
          }}
        >
          <Circle
            center={location}
            radius={HERE_HALO_RADIUS_M}
            strokeWidth={0}
            strokeColor="rgba(28, 126, 214, 0)"
            fillColor="rgba(28, 126, 214, 0.18)"
            zIndex={2}
          />
          <Circle
            center={location}
            radius={HERE_DOT_RADIUS_M}
            strokeWidth={2}
            strokeColor="#ffffff"
            fillColor={HERE_COLOR}
            zIndex={3}
          />

          {step === "suggest" &&
            suggestions.map((s) => (
              <Polygon
                key={s.key}
                coordinates={s.geometry}
                strokeColor="rgba(28, 126, 214, 0.9)"
                fillColor="rgba(28, 126, 214, 0.15)"
                strokeWidth={2}
                tappable
                onPress={() => pickSuggestion(s)}
              />
            ))}

          {step === "candidate" && candidate && (
            <Polygon
              coordinates={candidate.geometry}
              strokeColor="rgba(9, 180, 0, 0.9)"
              fillColor="rgba(0, 200, 42, 0.2)"
              strokeWidth={3}
            />
          )}

          {manual && vertices.length >= 3 && (
            <Polygon
              coordinates={vertices}
              strokeColor={
                issue?.isError
                  ? "rgba(224, 49, 49, 0.9)"
                  : "rgba(240, 140, 0, 0.9)"
              }
              fillColor={
                issue?.isError
                  ? "rgba(224, 49, 49, 0.15)"
                  : "rgba(240, 140, 0, 0.2)"
              }
              strokeWidth={3}
            />
          )}
          {manual && vertices.length === 2 && (
            <Polyline
              coordinates={vertices}
              strokeColor="rgba(240, 140, 0, 0.9)"
              strokeWidth={3}
            />
          )}
          {manual &&
            vertices.map((v) => (
              <Marker
                key={v.id}
                coordinate={{ latitude: v.latitude, longitude: v.longitude }}
                pinColor={VERTEX_COLOR}
                draggable
                onPress={() => removeVertex(v.id)}
                onDragEnd={(e) => moveVertex(v.id, e.nativeEvent.coordinate)}
              />
            ))}
        </MapView>

        {guide && (
          <View
            style={[
              styles.guide,
              guide.tone === "error"
                ? styles.guideError
                : guide.tone === "ok"
                  ? styles.guideOk
                  : styles.guideTodo,
            ]}
            pointerEvents="none"
          >
            <Text style={styles.guideText}>{guide.text}</Text>
          </View>
        )}

        {manual && (
          <View style={styles.tools}>
            <Pressable
              style={({ pressed }) => [
                styles.toolButton,
                vertices.length === 0 && styles.disabled,
                pressed && styles.pressed,
              ]}
              onPress={() => setVertices((prev) => prev.slice(0, -1))}
              disabled={vertices.length === 0}
              accessibilityRole="button"
              accessibilityLabel={t.scanMap.undo}
            >
              <MaterialDesignIcons name="undo" size={22} color="#212529" />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.toolButton,
                vertices.length === 0 && styles.disabled,
                pressed && styles.pressed,
              ]}
              onPress={() => setVertices([])}
              disabled={vertices.length === 0}
              accessibilityRole="button"
              accessibilityLabel={t.scanMap.clearAll}
            >
              <MaterialDesignIcons
                name="delete-outline"
                size={22}
                color="#212529"
              />
            </Pressable>
          </View>
        )}

        <View style={styles.attribution} pointerEvents="none">
          <Text style={styles.attributionText}>
            © OpenStreetMap contributors
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        {searching ? (
          <View style={styles.searching}>
            <ActivityIndicator color={Colors.tint} />
            <Text style={styles.subText}>{t.scanMap.searching}</Text>
          </View>
        ) : step === "suggest" ? (
          <View style={styles.info}>
            <Text style={styles.title}>{t.scanMap.nearbyTitle}</Text>
            <Text style={styles.subText} numberOfLines={2}>
              {t.scanMap.nearbyHint}
            </Text>
            <View style={styles.suggestList}>
              {suggestions.map((s) => (
                <Pressable
                  key={s.key}
                  style={({ pressed }) => [
                    styles.suggestItem,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => pickSuggestion(s)}
                  accessibilityRole="button"
                >
                  <MaterialDesignIcons
                    name="map-marker-outline"
                    size={20}
                    color={HERE_COLOR}
                  />
                  <Text style={styles.suggestName} numberOfLines={1}>
                    {s.name || t.common.unnamedPark}
                  </Text>
                  <Text style={styles.suggestDistance}>
                    {formatDistance(t, Math.max(1, s.distanceM))}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                style={({ pressed }) => [
                  styles.suggestItem,
                  styles.suggestDraw,
                  pressed && styles.pressed,
                ]}
                onPress={drawOwn}
                accessibilityRole="button"
              >
                <MaterialDesignIcons
                  name="vector-polygon"
                  size={20}
                  color={VERTEX_COLOR}
                />
                <Text style={styles.suggestName} numberOfLines={1}>
                  {t.scanMap.drawOwn}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : manual ? (
          <View style={styles.info}>
            <Text style={styles.title}>
              {lookupFailed ? t.scanMap.lookupFailed : t.scanMap.notFound}
            </Text>
            <Text style={styles.subText} numberOfLines={2}>
              {vertices.length === 0
                ? t.scanMap.issues.needPoints
                : t.scanMap.editTip}
            </Text>
            {suggestions.length > 0 && (
              <Pressable
                onPress={backToSuggestions}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text style={styles.link}>{t.scanMap.chooseNearby}</Text>
              </Pressable>
            )}
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder={t.scanMap.namePlaceholder}
              placeholderTextColor={Colors.mutedText}
              maxLength={MAX_NAME_LENGTH}
              returnKeyType="done"
            />
          </View>
        ) : (
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {candidate?.name || t.common.unnamedPark}
            </Text>
            {candidate?.address ? (
              <Text style={styles.subText} numberOfLines={1}>
                {candidate.address}
              </Text>
            ) : null}
            {suggestions.length > 0 && (
              <Pressable
                onPress={backToSuggestions}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text style={styles.link}>{t.scanMap.chooseOther}</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.retake,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              end();
            }}
            accessibilityRole="button"
          >
            <MaterialDesignIcons
              name="camera-retake"
              size={18}
              color="#ffffff"
            />
            <Text style={styles.buttonText}>{t.scanMap.retake}</Text>
          </Pressable>
          {step !== "suggest" && (
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.submit,
                !canSubmit && styles.disabled,
                pressed && canSubmit && styles.pressed,
              ]}
              onPress={submit}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit }}
            >
              <MaterialDesignIcons name="check" size={18} color="#ffffff" />
              <Text style={styles.buttonText}>{t.scanMap.decide}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  mapWrap: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  tools: {
    position: "absolute",
    top: 12,
    right: 12,
    gap: 8,
  },
  toolButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    elevation: 2,
  },
  guide: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 68,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    elevation: 2,
  },
  guideTodo: {
    backgroundColor: "rgba(240, 140, 0, 0.95)",
  },
  guideError: {
    backgroundColor: "rgba(224, 49, 49, 0.95)",
  },
  guideOk: {
    backgroundColor: "rgba(47, 158, 68, 0.95)",
  },
  guideText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  suggestList: {
    marginTop: 6,
    gap: 8,
  },
  suggestItem: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
  },
  suggestDraw: {
    borderStyle: "dashed",
  },
  suggestName: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
  },
  suggestDistance: {
    color: Colors.subText,
    fontSize: 13,
  },
  link: {
    marginTop: 4,
    color: HERE_COLOR,
    fontSize: 14,
    fontWeight: "bold",
  },
  attribution: {
    position: "absolute",
    left: 6,
    bottom: 4,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  attributionText: {
    fontSize: 10,
    color: "#495057",
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  searching: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
  },
  info: {
    gap: 4,
  },
  title: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "bold",
  },
  subText: {
    color: Colors.subText,
    fontSize: 13,
  },
  error: {
    color: Colors.danger,
  },
  nameInput: {
    height: 44,
    marginTop: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    color: Colors.text,
    fontSize: 15,
  },
  buttons: {
    flexDirection: "row",
    gap: 16,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  retake: {
    backgroundColor: Colors.danger,
  },
  submit: {
    backgroundColor: Colors.success,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
});
