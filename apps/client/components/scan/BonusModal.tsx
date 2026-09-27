import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { InferResponseType } from "hono/client";
import Colors from "@/constants/Colors";
import { api } from "@/lib/client";
import { useT } from "@/lib/i18n";
import { useLanguage } from "@/lib/language";
import { RuleIcon } from "@/components/rules/RuleIcon";
import { useTranslatedTexts } from "@/components/rules/useTranslatedTexts";

type RulesResponse = InferResponseType<typeof api.api.rules.$post, 201>;
export type Bonus = NonNullable<RulesResponse["bonus"]>;

type Props = {
  bonus: Bonus;
  onDone: (collected: boolean) => void;
};

export default function BonusModal({ bonus, onDone }: Props) {
  const [language] = useLanguage();
  const { textOf } = useTranslatedTexts([bonus.rule], language);
  const [sending, setSending] = useState(false);
  const t = useT();
  const parkName = bonus.parkName || null;

  const answer = async (exists: boolean) => {
    if (sending) return;
    setSending(true);
    let collected = false;
    try {
      const res = await api.api.rules.vote.$post({
        json: { parkId: bonus.parkId, ruleId: bonus.rule.id, exists },
      });
      if (res.ok) collected = (await res.json()).collected;
      else console.warn(`vote failed: ${res.status}`);
    } catch (e) {
      console.warn(e);
    }
    setSending(false);
    onDone(collected);
  };

  return (
    <Modal transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.badge}>{t.bonus.badge}</Text>
          <Text style={styles.message}>
            {bonus.kind === "verify"
              ? t.bonus.verifyMessage(parkName)
              : t.bonus.suggestMessage}
          </Text>
          <View style={styles.rule}>
            <RuleIcon
              name={bonus.rule.iconName}
              iconType={bonus.rule.iconType}
              size={64}
            />
            <Text style={styles.ruleText}>{textOf(bonus.rule)}</Text>
          </View>
          <Text style={styles.question}>
            {t.bonus.question(parkName)}
          </Text>

          {sending ? (
            <ActivityIndicator
              color={Colors.mutedText}
              style={styles.spinner}
            />
          ) : (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.accept,
                  pressed && styles.pressed,
                ]}
                onPress={() => answer(true)}
                accessibilityRole="button"
              >
                <Text style={styles.buttonText}>{t.bonus.accept}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.reject,
                  pressed && styles.pressed,
                ]}
                onPress={() => answer(false)}
                accessibilityRole="button"
              >
                <Text style={styles.rejectText}>{t.bonus.reject}</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  card: {
    alignSelf: "stretch",
    padding: 20,
    borderRadius: 16,
    backgroundColor: Colors.background,
  },
  badge: {
    alignSelf: "center",
    marginBottom: 8,
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.success,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.subText,
    textAlign: "center",
  },
  rule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginVertical: 18,
  },
  ruleText: {
    flex: 1,
    fontSize: 17,
    fontWeight: "bold",
    color: Colors.text,
  },
  question: {
    marginBottom: 14,
    fontSize: 14,
    color: Colors.text,
    textAlign: "center",
  },
  spinner: {
    marginVertical: 24,
  },
  button: {
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  accept: {
    backgroundColor: Colors.success,
  },
  reject: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  },
  rejectText: {
    color: Colors.text,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.7,
  },
});
