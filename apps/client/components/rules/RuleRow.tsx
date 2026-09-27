import type { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Colors from "@/constants/Colors";
import { RuleIcon } from "./RuleIcon";
import type { IconType } from "./types";

type Props = {
  iconName: string;
  iconType: IconType;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  highlighted?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function RuleRow({
  iconName,
  iconType,
  title,
  subtitle,
  right,
  highlighted = false,
  style,
}: Props) {
  return (
    <View
      style={[styles.row, highlighted && styles.highlighted, style]}
      accessibilityState={highlighted ? { selected: true } : undefined}
    >
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
  highlighted: {
    marginHorizontal: -12,
    paddingLeft: 8,
    paddingRight: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
    borderRadius: 8,
    borderBottomWidth: 0,
    backgroundColor: "#fdecea",
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
