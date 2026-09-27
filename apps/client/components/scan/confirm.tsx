import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/Colors";
import { ParkRules } from "@/components/rules/ParkRules";
import { scannedToDisplay, type ScannedRule } from "@/components/rules/types";
import { useT } from "@/lib/i18n";
import type { Area } from "./map";

type Props = {
  rules: ScannedRule[] | null;
  area: Area | null;
  onConfirm: () => Promise<void>;
  end: (message?: string) => Promise<void>;
};

export default function Confirm({ rules, area, onConfirm, end }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const t = useT();
  const canConfirm = rules !== null && rules.length > 0 && !submitting;

  const confirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ParkRules
      park={area}
      rules={rules?.map(scannedToDisplay) ?? null}
      loadingText={t.scanConfirm.reading}
      emptyText={t.scanConfirm.noRules}
      footer={
        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.wrong,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              end();
            }}
            disabled={submitting}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>{t.scanConfirm.wrong}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.confirm,
              !canConfirm && styles.disabled,
              pressed && styles.pressed,
            ]}
            onPress={confirm}
            disabled={!canConfirm}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canConfirm }}
          >
            <Text style={styles.buttonText}>
              {submitting ? t.scanConfirm.submitting : t.scanConfirm.collect}
            </Text>
          </Pressable>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  buttons: {
    flexDirection: "row",
    gap: 16,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  wrong: {
    backgroundColor: Colors.danger,
  },
  confirm: {
    backgroundColor: Colors.success,
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
