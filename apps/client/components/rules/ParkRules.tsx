import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Colors from "@/constants/Colors";
import { useLanguage } from "@/lib/language";
import { LanguagePicker } from "./LanguagePicker";
import { ParkHeader } from "./ParkHeader";
import { RuleRow } from "./RuleRow";
import type { DisplayRule } from "./types";
import { useTranslatedTexts } from "./useTranslatedTexts";

type Props = {
  park: { name: string; address: string } | null;
  rules: DisplayRule[] | null;
  loadingText?: string;
  emptyText?: string;
  footer?: ReactNode;
  highlightRuleId?: string;
  onReportRule?: (rule: DisplayRule, text: string) => void;
  onReportPark?: () => void;
  showDisclaimer?: boolean;
};

export const RULES_DISCLAIMER =
  "※ ここに載っているのは、看板などから登録されたルールの一部です。載っていないことでも、してよいとは限りません。現地の看板・管理者の指示や、まわりの人への配慮を優先してください。";

export function ParkRules({
  park,
  rules,
  loadingText = "読み込み中…",
  emptyText = "ルールがありません",
  footer,
  highlightRuleId,
  onReportRule,
  onReportPark,
  showDisclaimer = true,
}: Props) {
  const [language, setLanguage] = useLanguage();
  const { textOf, status } = useTranslatedTexts(rules ?? [], language);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ParkHeader name={park?.name ?? ""} address={park?.address ?? ""} />
        <View style={styles.toolbar}>
          {onReportPark ? (
            <Pressable
              onPress={onReportPark}
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [
                styles.reportPark,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.reportText}>公園を報告</Text>
            </Pressable>
          ) : null}
          {status === "loading" ? (
            <ActivityIndicator size="small" color={Colors.mutedText} />
          ) : null}
          <LanguagePicker value={language} onChange={setLanguage} />
        </View>
        {status === "error" ? (
          <Text style={styles.notice}>
            翻訳できなかったため、原文（英語）で表示しています
          </Text>
        ) : null}
      </View>

      {rules === null ? (
        <View style={styles.placeholder}>
          <ActivityIndicator size="large" color={Colors.mutedText} />
          <Text style={styles.placeholderText}>{loadingText}</Text>
        </View>
      ) : rules.length === 0 ? (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>{emptyText}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
        >
          {rules.map((rule) => {
            const text = textOf(rule);
            return (
              <RuleRow
                key={rule.id}
                iconName={rule.iconName}
                iconType={rule.iconType}
                title={text}
                subtitle={
                  rule.keywords && rule.keywords.length > 0
                    ? `Keyword: ${rule.keywords.join(", ")}`
                    : undefined
                }
                highlighted={
                  highlightRuleId !== undefined && rule.id === highlightRuleId
                }
                right={
                  onReportRule ? (
                    <Pressable
                      onPress={() => onReportRule(rule, text)}
                      accessibilityRole="button"
                      accessibilityLabel="このルールを報告"
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.reportRule,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.reportText}>報告</Text>
                    </Pressable>
                  ) : undefined
                }
              />
            );
          })}
          {showDisclaimer ? (
            <Text style={styles.disclaimer}>{RULES_DISCLAIMER}</Text>
          ) : null}
        </ScrollView>
      )}

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  notice: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.danger,
    textAlign: "right",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 20,
  },
  placeholderText: {
    fontSize: 15,
    color: Colors.subText,
    textAlign: "center",
  },
  reportPark: {
    marginRight: "auto",
    paddingVertical: 4,
  },
  reportRule: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  reportText: {
    fontSize: 12,
    color: Colors.mutedText,
    textDecorationLine: "underline",
  },
  pressed: {
    opacity: 0.5,
  },
  disclaimer: {
    marginTop: 16,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.mutedText,
    opacity: 0.8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});
