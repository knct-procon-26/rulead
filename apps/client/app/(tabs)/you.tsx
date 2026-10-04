import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { LanguagePicker } from "@/components/rules/LanguagePicker";

type Me = {
  userId: string;
  signCount: number;
  createdAt: string | null;
  apiUsedToday: number;
  apiDailyLimit: number;
  debugApi: boolean;
};

const VERSION = Constants.expoConfig?.version ?? "?";
const DEBUG_UNLOCK_TAPS = 7;

export default function YouTab() {
  const [language, setLanguage] = useLanguage();
  const t = useT();
  const [me, setMe] = useState<Me | null>(null);
  const [showDebug, setShowDebug] = useState(Debug.showDebugTools);
  const [taps, setTaps] = useState(0);
  const [accountBusy, setAccountBusy] = useState(false);
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

  const reload = useCallback(() => {
    if (showDebug) loadServer();
  }, [showDebug, loadServer]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const deleteAccount = async () => {
    if (accountBusy) return;
    setAccountBusy(true);
    try {
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
      if (mounted.current) setMe(null);
      Alert.alert(t.you.deleteDoneTitle, t.you.deleteDoneMessage);
    } catch (e) {
      console.warn(e);
      Alert.alert(t.you.deleteFailed, t.common.tryAgainOnline);
    } finally {
      if (mounted.current) setAccountBusy(false);
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
      </Section>

      <Section title={t.you.privacy}>
        <Text style={styles.body}>
          {t.you.privacyText}
        </Text>
      </Section>

      <Section title={t.you.accountSection}>
        <View style={styles.buttons}>
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

  const run = async (label: string, task: () => Promise<string>) => {
    if (busy) return;
    setBusy(true);
    try {
      const message = await task();
      Alert.alert(label, message);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
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
      </View>
      {me?.debugApi === false ? (
        <Text style={styles.note}>
          API回数のリセットは、サーバーの環境変数 ENABLE_DEBUG_API=true
          のときだけ使えます。
        </Text>
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
  smallButtonDanger: {
    color: Colors.danger,
  },
});
