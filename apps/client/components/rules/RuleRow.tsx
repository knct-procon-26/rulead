import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/Colors";
import { RuleIcon } from "./RuleIcon";
import type { IconType } from "./types";

type Props = {
  iconName: string;
  iconType: IconType;
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

export function RuleRow({ iconName, iconType, title, subtitle, right }: Props) {
  return (
    <View style={styles.row}>
      <RuleIcon name={iconName} iconType={iconType} />
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "bold",
    color: Colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.mutedText,
  },
  right: {
    alignItems: "flex-end",
    gap: 4,
  },
});
