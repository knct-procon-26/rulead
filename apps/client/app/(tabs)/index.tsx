import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import * as ParkTracker from "@/modules/park-tracker";
import Colors from "@/constants/Colors";
import { ParkRules } from "@/components/rules/ParkRules";
import { RuleSearchModal } from "@/components/rules/RuleSearchModal";
import { scannedToDisplay, type ScannedRule } from "@/components/rules/types";
import { endOuting, ensureOuting, startOuting } from "@/lib/outing";
import { useT, type Messages } from "@/lib/i18n";
import { promptReportPark, promptReportRule } from "@/lib/report";
import { useCameraWatchEnabled } from "@/lib/settings";

type LoadState =
  | { status: "loading"; parkId: string }
  | {
      status: "loaded";
      parkId: string;
      park: { name: string; address: string };
      rules: ScannedRule[];
      fetchedAt: number;
    }
  | { status: "error"; parkId: string; reason: "notSaved" | "loadFailed" };

type Highlight = { parkId: string; ruleId: string };

const PARK_ID_RE = /^[1-9][0-9]{0,9}$/;

const INITIAL_WATCH: ParkTracker.RuleWatchStatus = {
  running: false,
  cameraActive: false,
  parkId: null,
  parkName: null,
  debug: false,
};

function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function describeError(
  t: Messages,
  e: unknown,
  permissionMessage: string,
): string {
  const code = (e as { code?: unknown } | null)?.code;
  switch (code) {
    case "E_PERMISSION":
      return permissionMessage;
    case "E_NOT_TRACKING":
      return t.rulesTab.errorNotTracking;
    case "E_START":
    case "E_NOT_STARTED":
      return t.rulesTab.errorNotStarted;
    default:
      return e instanceof Error ? e.message : String(e);
  }
}

function orderForDisplay(
  rules: ScannedRule[],
  highlightRuleId: string | undefined,
): ScannedRule[] {
  if (highlightRuleId === undefined) return rules;
  const hit = rules.filter((r) => r.id === highlightRuleId);
  if (hit.length === 0) return rules;
  return [...hit, ...rules.filter((r) => r.id !== highlightRuleId)];
}

export default function RuleTab() {
  const params = useLocalSearchParams<{
    parkId?: string;
    ruleId?: string;
    at?: string;
  }>();
  const linkParkId = firstParam(params.parkId);
  const linkRuleId = firstParam(params.ruleId);
  const linkAt = firstParam(params.at);

  const [pinnedParkId, setPinnedParkId] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [currentParks, setCurrentParks] = useState<
    ParkTracker.CurrentPark[] | null
  >(null);
  const [tracking, setTracking] = useState(false);
  const [watch, setWatch] =
    useState<ParkTracker.RuleWatchStatus>(INITIAL_WATCH);
  const [load, setLoad] = useState<LoadState | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [detailsTick, setDetailsTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const cameraWatchEnabled = useCameraWatchEnabled();
  const t = useT();
  const refreshSeq = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (linkParkId !== undefined && PARK_ID_RE.test(linkParkId)) {
      setPinnedParkId(linkParkId);
      setHighlight(
        linkRuleId ? { parkId: linkParkId, ruleId: linkRuleId } : null,
      );
    }
  }, [linkParkId, linkRuleId, linkAt]);

  const refreshNative = useCallback(async () => {
    const seq = ++refreshSeq.current;
    try {
      const [parks, enabled, status] = await Promise.all([
        ParkTracker.getCurrentParks(),
        ParkTracker.isEnabled(),
        ParkTracker.getRuleWatchStatus(),
      ]);
      if (!mounted.current || seq !== refreshSeq.current) return;
      setCurrentParks(parks);
      setTracking(enabled);
      setWatch(status);
      setDetailsTick((t) => t + 1);
    } catch (e) {
      console.warn(e);
      if (!mounted.current || seq !== refreshSeq.current) return;
      setCurrentParks((prev) => prev ?? []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshNative();
    }, [refreshNative]),
  );

  useEffect(() => {
    const resume = () => {
      ensureOuting().finally(() => {
        if (mounted.current) refreshNative();
      });
    };
    resume();
    const appState = AppState.addEventListener("change", (s) => {
      if (s === "active") resume();
    });
    return () => appState.remove();
  }, [refreshNative]);

  useEffect(() => {
    const subs = [
      ParkTracker.addListener("ParkTrackerEnter", () => {
        setPinnedParkId(null);
        refreshNative();
      }),
      ParkTracker.addListener("ParkTrackerExit", (e) => {
        setPinnedParkId((prev) => (prev === e.parkId ? null : prev));
        refreshNative();
      }),
      ParkTracker.addListener("ParkTrackerOutingEnded", () => {
        refreshNative();
      }),
      ParkTracker.addListener("RuleWatchStopped", () => {
        refreshNative();
      }),
      ParkTracker.addListener("RuleWatchAlert", (e) => {
        setHighlight({ parkId: e.parkId, ruleId: e.ruleId });
      }),
    ];
    return () => {
      subs.forEach((s) => s.remove());
    };
  }, [refreshNative]);

  const latestCurrent = useMemo(() => {
    if (!currentParks || currentParks.length === 0) return null;
    return currentParks.reduce((a, b) => (b.enteredAt >= a.enteredAt ? b : a));
  }, [currentParks]);

  const pinnedVisible =
    pinnedParkId !== null &&
    (!tracking ||
      (currentParks?.some((p) => p.parkId === pinnedParkId) ?? false));
  const targetParkId =
    (pinnedVisible ? pinnedParkId : null) ?? latestCurrent?.parkId ?? null;
  const highlightRuleId =
    highlight !== null && highlight.parkId === targetParkId
      ? highlight.ruleId
      : undefined;

  useEffect(() => {
    if (targetParkId === null) {
      setLoad(null);
      return;
    }
    let cancelled = false;
    setLoad((prev) =>
      prev !== null && prev.parkId === targetParkId && prev.status === "loaded"
        ? prev
        : { status: "loading", parkId: targetParkId },
    );
    (async () => {
      try {
        const d = await ParkTracker.getParkDetails(targetParkId);
        if (cancelled) return;
        if (d === null) {
          setLoad({
            status: "error",
            parkId: targetParkId,
            reason: "notSaved",
          });
          return;
        }
        setLoad((prev) =>
          prev !== null &&
          prev.status === "loaded" &&
          prev.parkId === targetParkId &&
          prev.fetchedAt === d.fetchedAt
            ? prev
            : {
                status: "loaded",
                parkId: targetParkId,
                park: { name: d.name, address: d.address },
                rules: d.rules,
                fetchedAt: d.fetchedAt,
              },
        );
      } catch (e) {
        console.warn(e);
        if (cancelled) return;
        setLoad({
          status: "error",
          parkId: targetParkId,
          reason: "loadFailed",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetParkId, reloadKey, detailsTick]);

  const view = load !== null && load.parkId === targetParkId ? load : null;

  const displayRules = useMemo(() => {
    if (view === null || view.status === "loading") return null;
    if (view.status === "error") return [];
    return orderForDisplay(view.rules, highlightRuleId).map(scannedToDisplay);
  }, [view, highlightRuleId]);

  const inside =
    targetParkId !== null &&
    (currentParks?.some((p) => p.parkId === targetParkId) ?? false);

  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await task();
    } finally {
      if (mounted.current) setBusy(false);
      refreshNative();
    }
  };

  const onStartOuting = () =>
    run(async () => {
      try {
        await startOuting();
      } catch (e) {
        Alert.alert(
          t.rulesTab.startOutingFailed,
          describeError(t, e, t.rulesTab.locationNotAllowed),
        );
      }
    });

  const onEndOuting = () =>
    run(async () => {
      try {
        await endOuting();
      } catch (e) {
        Alert.alert(t.rulesTab.endOutingFailed, describeError(t, e, ""));
      }
    });

  const onResumeCamera = () =>
    run(async () => {
      try {
        if (!(await ParkTracker.requestCameraPermission())) {
          Alert.alert(
            t.rulesTab.cameraPermissionTitle,
            t.rulesTab.cameraPermissionMessage,
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
          return;
        }
        await ParkTracker.startRuleWatch();
      } catch (e) {
        Alert.alert(
          t.rulesTab.startWatchFailed,
          describeError(t, e, t.rulesTab.cameraNotAllowed),
        );
      }
    });

  if (Platform.OS !== "android") {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>{t.rulesTab.androidOnly}</Text>
      </View>
    );
  }

  if (currentParks === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.mutedText} />
      </View>
    );
  }

  if (targetParkId === null) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>
          {tracking ? t.rulesTab.outingTitle : t.rulesTab.readyTitle}
        </Text>
        <Text style={styles.text}>
          {tracking ? t.rulesTab.outingDescription : t.rulesTab.readyDescription}
        </Text>
        <View style={styles.centerButton}>
          {tracking ? (
            <ActionButton
              label={t.rulesTab.endOuting}
              kind="danger"
              busy={busy}
              onPress={onEndOuting}
            />
          ) : (
            <ActionButton
              label={t.rulesTab.startOuting}
              busy={busy}
              onPress={onStartOuting}
            />
          )}
          <SearchLink
            label={t.rulesTab.searchNearby}
            onPress={() => setSearchOpen(true)}
          />
        </View>
        <RuleSearchModal
          visible={searchOpen}
          onClose={() => setSearchOpen(false)}
        />
      </View>
    );
  }

  const fallbackName =
    currentParks.find((p) => p.parkId === targetParkId)?.name ?? "";
  const park =
    view?.status === "loaded"
      ? { name: view.park.name, address: view.park.address }
      : { name: fallbackName, address: "" };

  const footerParts: ReactNode[] = [];
  const parkIdNum = Number(targetParkId);
  const canReport = Number.isSafeInteger(parkIdNum) && parkIdNum > 0;

  if (
    pinnedVisible &&
    latestCurrent !== null &&
    latestCurrent.parkId !== pinnedParkId
  ) {
    footerParts.push(
      <Pressable
        key="back"
        onPress={() => setPinnedParkId(null)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
      >
        <Text style={styles.linkText}>
          {t.rulesTab.showCurrentPark(latestCurrent.name || t.common.park)}
        </Text>
      </Pressable>,
    );
  }

  if (view?.status === "error") {
    footerParts.push(
      <ActionButton
        key="reload"
        label={t.common.reload}
        onPress={() => setReloadKey((k) => k + 1)}
      />,
    );
  }

  if (view?.status === "loaded" && view.rules.length > 0) {
    footerParts.push(
      <SearchLink
        key="search"
        label={t.rulesTab.searchWithTheseRules}
        onPress={() => setSearchOpen(true)}
      />,
    );
  }

  if (tracking) {
    if (inside && view?.status === "loaded" && view.rules.length > 0) {
      if (!cameraWatchEnabled && !watch.running) {
        footerParts.push(
          <Text key="watch" style={styles.watchText}>
            {t.rulesTab.watchOff}
          </Text>,
        );
      } else if (watch.running) {
        footerParts.push(
          <Text key="watch" style={styles.watchText}>
            {t.rulesTab.watching}
          </Text>,
        );
      } else {
        footerParts.push(
          <Text key="watch" style={styles.watchText}>
            {t.rulesTab.watchStopped}
          </Text>,
          <ActionButton
            key="resume"
            label={t.rulesTab.resumeWatch}
            busy={busy}
            onPress={onResumeCamera}
          />,
        );
      }
    }
    footerParts.push(
      <ActionButton
        key="end"
        label={t.rulesTab.endOuting}
        kind="danger"
        busy={busy}
        onPress={onEndOuting}
      />,
    );
  } else {
    footerParts.push(
      <ActionButton
        key="start"
        label={t.rulesTab.startOuting}
        busy={busy}
        onPress={onStartOuting}
      />,
    );
  }

  return (
    <>
      <ParkRules
        park={park}
        rules={displayRules}
        loadingText={t.rulesTab.loadingRules}
        emptyText={
          view?.status === "error"
            ? view.reason === "notSaved"
              ? t.rulesTab.parkNotSaved
              : t.rulesTab.parkLoadFailed
            : t.rulesTab.noRules
        }
        highlightRuleId={highlightRuleId}
        footer={<View style={styles.footer}>{footerParts}</View>}
        onReportRule={
          canReport
            ? (rule, text) => {
                promptReportRule(parkIdNum, rule.id, text);
              }
            : undefined
        }
        onReportPark={
          canReport
            ? () => {
                promptReportPark(parkIdNum, park.name);
              }
            : undefined
        }
      />
      <RuleSearchModal
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        priorityRuleIds={
          view?.status === "loaded" ? view.rules.map((r) => r.id) : undefined
        }
      />
    </>
  );
}

function SearchLink({
  onPress,
  label,
}: {
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.searchLink, pressed && styles.pressed]}
    >
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

function ActionButton({
  label,
  onPress,
  kind = "primary",
  busy = false,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "danger";
  busy?: boolean;
}) {
  const t = useT();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        kind === "danger" ? styles.buttonDanger : styles.buttonPrimary,
        busy && styles.disabled,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, busy }}
    >
      <Text style={styles.buttonText}>{busy ? t.common.processing : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: Colors.background,
  },
  centerButton: {
    marginTop: 24,
    alignSelf: "stretch",
  },
  title: {
    marginBottom: 12,
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.text,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.subText,
    textAlign: "center",
  },
  footer: {
    gap: 10,
  },
  watchText: {
    fontSize: 13,
    lineHeight: 18,
    color: Colors.subText,
  },
  linkButton: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  searchLink: {
    alignSelf: "center",
    paddingVertical: 10,
  },
  linkText: {
    fontSize: 14,
    color: Colors.tint,
  },
  button: {
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  buttonPrimary: {
    backgroundColor: Colors.success,
  },
  buttonDanger: {
    backgroundColor: Colors.danger,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  },
});
