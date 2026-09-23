import { Button, ScrollView, StyleSheet } from "react-native";
import { Text, View } from "@/components/Themed";
import { useRef } from "react";
import { Icon } from "../Icon";

type Rule = {
  id: string;
  text: string;
  iconId: number;
  iconName: string;
  iconType: "prohibition" | "caution" | "information";
  keywords: { id: number; label: string }[];
};
type props = {
  onConfirm: () => void;
  rules: Rule[];
  end: (message?: string) => Promise<void>;
};

export default function Confirm({ onConfirm, rules, end }: props) {
  console.log(rules);
  return (
    <ScrollView style={styles.container}>
      {rules.map((rule) => (
        <View style={styles.xStack} key={rule.id}>
          <Icon name={rule.iconName} iconType={rule.iconType}></Icon>
          <Text>{rule.text}</Text>
          <Text>{rule.keywords.map((i) => i.label).join(", ")}</Text>
        </View>
      ))}
      <Button
        title="Wrong"
        onPress={() => {
          end();
        }}
      />
      <Button
        title="Confirm"
        onPress={onConfirm}
        disabled={rules.length === 0}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: "center",
    // alignItems: "center",
  },

  xStack: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});
