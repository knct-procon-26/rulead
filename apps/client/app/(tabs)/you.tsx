import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Constants from "expo-constants";
import { useFocusEffect } from "expo-router";
import Colors from "@/constants/Colors";
import Debug from "@/constants/Debug";
import { api, resetToken } from "@/lib/client";
import { useT } from "@/lib/i18n";
import { useLanguage } from "@/lib/language";
import { applyCameraWatchSetting, endOuting } from "@/lib/outing";
import { setCameraWatchEnabled, useCameraWatchEnabled } from "@/lib/settings";
import { LanguagePicker } from "@/components/rules/LanguagePicker";
import * as ParkTracker from "@/modules/park-tracker";

type Me = {
  userId: string;
  signCount: number;
  createdAt: string | null;
  apiUsedToday: number;
  apiDailyLimit: number;
  debugApi: boolean;
};

type DeviceState = {
  permissions: ParkTracker.PermissionStatus;
  camera: boolean;
  tracking: boolean;
  running: boolean;
  watch: ParkTracker.RuleWatchStatus;
};

const isAndroid = Platform.OS === "android";
const VERSION = Constants.expoConfig?.version ?? "?";
const DEBUG_UNLOCK_TAPS = 7;

export default function YouTab() {
  const [language, setLanguage] = useLanguage();
  const cameraWatch = useCameraWatchEnabled();
  const t = useT();
  const [me, setMe] = useState<Me | null>(null);
  const [device, setDevice] = useState<DeviceState | null>(null);
  const [showDebug, setShowDebug] = useState(Debug.showDebugTools);
  const [taps, setTaps] = useState(0);
  const [accountBusy, setAccountBusy] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadServer = useCallback(async () => {
    try {
      const res = await api.api.me.$get();
      if (!mounted.current) return;
      if (res.ok) setMe(await res.json());
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const loadDevice = useCallback(async () => {
    if (!isAndroid) return;
    try {
      const [permissions, camera, tracking, running, watch] = await Promise.all(
        [
          ParkTracker.getPermissionStatus(),
          ParkTracker.hasCameraPermission(),
          ParkTracker.isEnabled(),
          ParkTracker.isRunning(),
          ParkTracker.getRuleWatchStatus(),
        ],
      );
      if (!mounted.current) return;
      setDevice({ permissions, camera, tracking, running, watch });
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const reload = useCallback(() => {
    if (showDebug) loadServer();
    loadDevice();
  }, [showDebug, loadServer, loadDevice]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const onToggleCameraWatch = async (enabled: boolean) => {
    if (cameraBusy) return;
    setCameraBusy(true);
    setCameraWatchEnabled(enabled);
    try {
      const ok = await applyCameraWatchSetting(enabled);
      if (!ok) {
        Alert.alert(t.you.cameraPermissionTitle, t.you.cameraPermissionMessage);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      if (mounted.current) setCameraBusy(false);
      loadDevice();
    }
  };

  const clearLocalRecords = async () => {
    if (!isAndroid) return;
    const before = Date.now() + 1;
    await Promise.all([
      ParkTracker.clearVisits(before),
      ParkTracker.clearTrack(before),
      ParkTracker.clearSightings(before),
      ParkTracker.clearRuleAlerts(before),
    ]);
  };

  const onClearLocal = () =>
    Alert.alert(
      t.you.clearLocalTitle,
      t.you.clearLocalMessage,
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.you.clearLocalConfirm,
          style: "destructive",
          onPress: async () => {
            if (accountBusy) return;
            setAccountBusy(true);
            try {
              await clearLocalRecords();
              Alert.alert(t.you.clearLocalDone);
            } catch (e) {
              console.warn(e);
              Alert.alert(t.you.clearLocalFailed, String(e));
            } finally {
              if (mounted.current) setAccountBusy(false);
            }
          },
        },
      ],
    );

  const deleteAccount = async () => {
    if (accountBusy) return;
    setAccountBusy(true);
    try {
      if (isAndroid) await endOuting().catch((e) => console.warn(e));
      const res = await api.api.me.$delete();
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body && typeof body === "object" && "error" in body
            ? String(body.error)
            : `HTTP ${res.status}`,
        );
      }
      await resetToken();
      if (isAndroid) await clearLocalRecords().catch((e) => console.warn(e));
      if (mounted.current) setMe(null);
      Alert.alert(t.you.deleteDoneTitle, t.you.deleteDoneMessage);
    } catch (e) {
      console.warn(e);
      Alert.alert(t.you.deleteFailed, t.common.tryAgainOnline);
    } finally {
      if (mounted.current) setAccountBusy(false);
      loadDevice();
    }
  };

  const onDeleteAccount = () =>
    Alert.alert(
      t.you.deleteTitle,
      t.you.deleteMessage,
      [
        { text: t.common.cancel, style: "cancel" },
        { text: t.you.deleteConfirm, style: "destructive", onPress: deleteAccount },
      ],
    );

  const onVersionTap = () => {
    if (showDebug) return;
    const next = taps + 1;
    setTaps(next);
    if (next >= DEBUG_UNLOCK_TAPS) {
      setShowDebug(true);
      Alert.alert(t.you.debugUnlocked);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Section title={t.you.settings}>
        <Row label={t.you.language}>
          <LanguagePicker value={language} onChange={setLanguage} />
        </Row>
        <Text style={styles.note}>{t.you.languageNote}</Text>
        {isAndroid ? (
          <>
            <Row label={t.you.cameraWatchSetting}>
              <Switch
                value={cameraWatch}
                onValueChange={onToggleCameraWatch}
                disabled={cameraBusy}
              />
            </Row>
            <Text style={styles.note}>{t.you.cameraWatchNote}</Text>
            <View style={styles.buttons}>
              <SmallButton
                label={t.you.openNotificationSettings}
                onPress={() =>
                  ParkTracker.openAppSettings().catch((e) => console.warn(e))
                }
              />
            </View>
          </>
        ) : null}
      </Section>

      {isAndroid ? (
        <Section title={t.you.statusSection}>
          {device === null ? (
            <ActivityIndicator color={Colors.mutedText} />
          ) : (
            <>
              <Row label={t.you.outing}>
                <Text style={styles.value}>
                  {device.tracking
                    ? device.running
                      ? t.you.outingActive
                      : t.you.outingPaused
                    : t.you.outingInactive}
                </Text>
              </Row>
              <Row label={t.you.cameraWatch}>
                <Text style={styles.value}>
                  {device.watch.running
                    ? device.watch.cameraActive
                      ? t.you.watchActive(
                          device.watch.parkName || t.common.park,
                        )
                      : t.you.watchWaiting
                    : t.you.watchStopped}
                </Text>
              </Row>
              <Row label={t.you.location}>
                <Text style={styles.value}>
                  {t.you.locationStatus[device.permissions.location]}
                </Text>
              </Row>
              <Row label={t.you.backgroundLocation}>
                <Text style={styles.value}>
                  {device.permissions.background
                    ? t.you.alwaysAllowed
                    : t.you.notAllowed}
                </Text>
              </Row>
              <Row label={t.you.notifications}>
                <Text style={styles.value}>
                  {device.permissions.notifications
                    ? t.you.allowed
                    : t.you.notAllowed}
                </Text>
              </Row>
              <Row label={t.you.camera}>
                <Text style={styles.value}>
                  {device.camera ? t.you.allowed : t.you.notAllowed}
                </Text>
              </Row>
              <View style={styles.buttons}>
                <SmallButton
                  label={t.you.openAppSettings}
                  onPress={() =>
                    ParkTracker.openAppSettings().catch((e) => console.warn(e))
                  }
                />
                <SmallButton
                  label={t.you.batterySettings}
                  onPress={() =>
                    ParkTracker.openBatterySettings().catch((e) =>
                      console.warn(e),
                    )
                  }
                />
              </View>
              <Text style={styles.note}>{t.you.batteryNote}</Text>
            </>
          )}
        </Section>
      ) : null}

      <Section title={t.you.privacy}>
        <Text style={styles.body}>
          {t.you.privacyText}
        </Text>
      </Section>

      <Section title={t.you.accountSection}>
        <View style={styles.buttons}>
          {isAndroid ? (
            <SmallButton
              label={t.you.clearLocal}
              onPress={onClearLocal}
              disabled={accountBusy}
            />
          ) : null}
          <SmallButton
            label={t.you.deleteAccount}
            onPress={onDeleteAccount}
            disabled={accountBusy}
            danger
          />
        </View>
        <Text style={styles.note}>{t.you.deleteNote}</Text>
      </Section>

      <Pressable onPress={onVersionTap} style={styles.version}>
        <Text style={styles.versionText}>{t.you.version(VERSION)}</Text>
      </Pressable>

      {showDebug ? <DebugSection me={me} onChanged={reload} /> : null}
    </ScrollView>
  );
}

function DebugSection({
  me,
  onChanged,
}: {
  me: Me | null;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const add = useCallback((s: string) => {
    setLog((l) =>
      [`${new Date().toLocaleTimeString()} ${s}`, ...l].slice(0, 50),
    );
  }, []);

  useEffect(() => {
    if (!isAndroid) return;
    const subs = [
      ParkTracker.addListener("ParkTrackerLocation", (e) =>
        add(
          `位置 ±${Math.round(e.accuracy)}m 公園内${e.insideParkIds.length}件 次の取得まで${Math.round(e.intervalMs / 1000)}秒`,
        ),
      ),
      ParkTracker.addListener("ParkTrackerEnter", (e) =>
        add(
          `入園 ${e.name || e.parkId}${e.firstToday ? "（通知した）" : "（今日は通知済み）"}`,
        ),
      ),
      ParkTracker.addListener("ParkTrackerExit", (e) =>
        add(`退園 ${e.parkId}`),
      ),
      ParkTracker.addListener("ParkTrackerError", (e) =>
        add(`エラー ${e.message}`),
      ),
      ParkTracker.addListener("RuleWatchLabels", (e) =>
        add(
          `見えたもの ${e.labels
            .map((l) => `${l.label}(${Math.round(l.confidence * 100)}%)`)
            .join(", ")}`,
        ),
      ),
      ParkTracker.addListener("RuleWatchAlert", (e) =>
        add(
          `ルール検出 ${e.label}（${Math.round(e.confidence * 100)}%）→ ${e.ruleText}`,
        ),
      ),
      ParkTracker.addListener("RuleWatchStopped", (e) =>
        add(`見守り停止 ${e.reason}`),
      ),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [add]);

  const run = async (label: string, task: () => Promise<string>) => {
    if (busy) return;
    setBusy(true);
    try {
      const message = await task();
      add(`${label}: ${message}`);
      Alert.alert(label, message);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      add(`${label}: 失敗 ${message}`);
      Alert.alert(`${label}できませんでした`, message);
    } finally {
      setBusy(false);
      onChanged();
    }
  };

  const resetApi = () =>
    run("今日のAPI回数をリセット", async () => {
      const res = await api.api.debug["reset-api-count"].$post();
      if (!res.ok) {
        throw new Error(
          res.status === 404
            ? "サーバーで ENABLE_DEBUG_API=true が設定されていません"
            : `HTTP ${res.status}`,
        );
      }
      return "0 に戻しました";
    });

  const resetEnter = () =>
    run("入園通知をリセット", async () => {
      const n = await ParkTracker.resetEnterNotifications();
      return `今日の通知済みの記録を${n}件消しました。公園を出て入り直すと、もう一度通知されます。`;
    });

  const resetAlerts = () =>
    Alert.alert(
      "ルール通知の記録を消しますか？",
      "同じルールをすぐにもう一度通知できるようになります。日記に出る「注意したルール」の記録も消えます。",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "消す",
          style: "destructive",
          onPress: () =>
            run("ルール通知の記録を消す", async () => {
              const n = await ParkTracker.clearRuleAlerts(Date.now() + 1);
              return `${n}件消しました`;
            }),
        },
      ],
    );

  const refresh = () =>
    run("公園とルールを取り直す", async () => {
      await ParkTracker.refreshParks();
      return "次に位置を取得したときに、サーバーから取り直します";
    });

  return (
    <Section title="開発者向け">
      <Row label="ユーザーID">
        <Text style={styles.mono} selectable>
          {me?.userId ?? "-"}
        </Text>
      </Row>
      <Row label="今日のAPI使用量">
        <Text style={styles.value}>
          {me ? `${me.apiUsedToday} / ${me.apiDailyLimit}` : "-"}
        </Text>
      </Row>
      <Row label="APIサーバー">
        <Text style={styles.mono} selectable>
          {Debug.apiBaseUrl}
        </Text>
      </Row>
      <View style={styles.buttons}>
        <SmallButton
          label="今日のAPI回数をリセット"
          onPress={resetApi}
          disabled={busy || me?.debugApi === false}
        />
        {isAndroid ? (
          <>
            <SmallButton
              label="入園通知をリセット"
              onPress={resetEnter}
              disabled={busy}
            />
            <SmallButton
              label="ルール通知の記録を消す"
              onPress={resetAlerts}
              disabled={busy}
            />
            <SmallButton
              label="公園とルールを取り直す"
              onPress={refresh}
              disabled={busy}
            />
          </>
        ) : null}
      </View>
      {me?.debugApi === false ? (
        <Text style={styles.note}>
          API回数のリセットは、サーバーの環境変数 ENABLE_DEBUG_API=true
          のときだけ使えます。
        </Text>
      ) : null}
      {isAndroid ? (
        <View style={styles.log}>
          <Text style={styles.logTitle}>ログ（この画面を開いている間）</Text>
          {log.length === 0 ? (
            <Text style={styles.logLine}>まだありません</Text>
          ) : (
            log.map((l, i) => (
              <Text key={`${i}-${l}`} style={styles.logLine}>
                {l}
              </Text>
            ))
          )}
        </View>
      ) : null}
    </Section>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.rowValue}>{children}</View>
    </View>
  );
}

function SmallButton({
  label,
  onPress,
  disabled = false,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.smallButton,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[styles.smallButtonText, danger && styles.smallButtonDanger]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.subText,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowValue: {
    flexShrink: 1,
    alignItems: "flex-end",
  },
  label: {
    fontSize: 14,
    color: Colors.text,
  },
  value: {
    fontSize: 14,
    color: Colors.subText,
    textAlign: "right",
  },
  mono: {
    fontSize: 12,
    color: Colors.subText,
    textAlign: "right",
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.subText,
  },
  note: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.mutedText,
  },
  buttons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  smallButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  smallButtonText: {
    fontSize: 13,
    color: Colors.tint,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.6,
  },
  version: {
    alignSelf: "center",
    paddingVertical: 8,
    marginBottom: 16,
  },
  versionText: {
    fontSize: 12,
    color: Colors.mutedText,
  },
  log: {
    marginTop: 4,
    gap: 2,
  },
  logTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: Colors.subText,
  },
  logLine: {
    fontSize: 11,
    color: Colors.mutedText,
  },
  smallButtonDanger: {
    color: Colors.danger,
  },
});
