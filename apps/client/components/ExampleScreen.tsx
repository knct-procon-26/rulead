import { useCallback, useEffect, useState } from "react";
import { Alert, AppState, Button, FlatList, Text, View } from "react-native";
import * as ParkTracker from "../modules/park-tracker";
import Debug from "@/constants/Debug";
import { api, getToken } from "@/lib/client";
const API_URL = `${Debug.apiBaseUrl}/api/parks/nearby`;
const trackerOptions = async (): Promise<ParkTracker.TrackerOptions> => ({
  apiUrl: API_URL,
  headers: { Authorization: `Bearer ${await getToken()}` },
});

export default function ExampleScreen() {
  const [running, setRunning] = useState(false);
  const [visits, setVisits] = useState<ParkTracker.Visit[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const add = (s: string) =>
    setLog((l) =>
      [`${new Date().toLocaleTimeString()} ${s}`, ...l].slice(0, 100),
    );

  const reload = useCallback(async () => {
    try {
      if (await ParkTracker.ensureRunning(await trackerOptions()))
        add("記録を再開しました");
    } catch (e: any) {
      add(`再開できませんでした: ${e?.code ?? ""} ${e?.message ?? e}`);
    }
    setRunning(await ParkTracker.isRunning());
    setVisits(await ParkTracker.getVisits(ParkTracker.startOfDay()));
  }, []);

  useEffect(() => {
    reload();
    const appState = AppState.addEventListener("change", (s) => {
      if (s === "active") reload();
    });
    const subs = [
      ParkTracker.addListener("ParkTrackerLocation", (e) =>
        add(
          `位置 ${e.lat.toFixed(5)},${e.lng.toFixed(5)} ±${Math.round(e.accuracy)}m ` +
            `次の取得まで${Math.round(e.intervalMs / 1000)}秒`,
        ),
      ),
      ParkTracker.addListener("ParkTrackerEnter", (e) => {
        add(
          `入園 ${e.name || e.parkId}${e.firstToday ? "（通知した）" : "（今日は通知済み）"}`,
        );
        reload();
      }),
      ParkTracker.addListener("ParkTrackerExit", (e) =>
        add(`退園 ${e.parkId}`),
      ),
      ParkTracker.addListener("ParkTrackerError", (e) =>
        add(`エラー ${e.message}`),
      ),
      ParkTracker.addListener("RuleWatchAlert", (e) =>
        add(
          `ルール検出 ${e.label}（${Math.round(e.confidence * 100)}%）→ ${e.ruleText}`,
        ),
      ),
      ParkTracker.addListener("RuleWatchStopped", (e) =>
        add(`カメラの見守りを停止（${e.reason}）`),
      ),
    ];
    return () => {
      appState.remove();
      subs.forEach((s) => s.remove());
    };
  }, [reload]);

  const onStart = async () => {
    const p = await ParkTracker.requestPermissions();
    if (p.location !== "precise") {
      Alert.alert(
        "正確な位置情報が必要です",
        "設定画面で位置情報を「正確な位置」にしてください。",
        [
          { text: "キャンセル", style: "cancel" },
          { text: "設定を開く", onPress: () => ParkTracker.openAppSettings() },
        ],
      );
      return;
    }
    if (!p.background) {
      add("「常に許可」なし：OS に止められた後は自動で再開しません");
    }
    if (!p.notifications) {
      add("通知が許可されていないため、入園の通知は出ません");
    }
    try {
      await ParkTracker.start(await trackerOptions());
      setRunning(true);
    } catch (e: any) {
      Alert.alert(
        "開始できませんでした",
        `${e?.code ?? ""} ${e?.message ?? e}`,
      );
    }
  };

  const onStop = async () => {
    await ParkTracker.stop();
    setRunning(false);
  };

  const onShowTrack = async () => {
    const points = await ParkTracker.getTrack(ParkTracker.startOfDay());
    Alert.alert("今日の公園内の記録", `${points.length} 件`);
  };

  const onShowSightings = async () => {
    try {
      const from = ParkTracker.startOfDay();
      const [sightings, alerts] = await Promise.all([
        ParkTracker.getSightings(from),
        ParkTracker.getRuleAlerts(from),
      ]);
      const lines = sightings
        .slice()
        .sort((a, b) => b.count - a.count)
        .slice(0, 20)
        .map((s) => `${s.label} ×${s.count}（${s.parkName || s.parkId}）`);
      Alert.alert(
        "今日カメラで見たもの",
        `${sightings.length} 種類・ルールの通知 ${alerts.length} 件\n\n${lines.join("\n") || "まだありません"}`,
      );
    } catch (e: any) {
      Alert.alert("読み込めませんでした", `${e?.message ?? e}`);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16, gap: 8 }}>
      <Text>状態: {running ? "記録中" : "停止中"}</Text>
      <Button
        title={running ? "停止" : "開始"}
        onPress={running ? onStop : onStart}
      />
      <Button title="今日の位置記録の件数" onPress={onShowTrack} />
      <Button title="今日カメラで見たもの" onPress={onShowSightings} />
      <Button
        title="電池の最適化設定を開く"
        onPress={() => ParkTracker.openBatterySettings()}
      />
      <Text style={{ marginTop: 8, fontWeight: "bold" }}>今日入った公園</Text>
      {visits.length === 0 ? <Text>まだありません</Text> : null}
      {visits.map((v) => (
        <Text key={`${v.parkId}-${v.day}`}>
          {new Date(v.enteredAt).toLocaleTimeString()} {v.name || v.parkId}
        </Text>
      ))}
      <Text style={{ marginTop: 8, fontWeight: "bold" }}>ログ</Text>
      <FlatList
        data={log}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <Text>{item}</Text>}
      />
    </View>
  );
}
