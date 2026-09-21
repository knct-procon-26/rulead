import { Button, StyleSheet } from "react-native";
import { Text, View } from "@/components/Themed";

type props = {
  onConfirm: () => void;
  rules: { id: string; text: string }[];
  end: (message?: string) => Promise<void>;
};

export default function Confirm({ onConfirm, rules, end }: props) {
  return (
    <View style={styles.container}>
      {rules.map((rule) => (
        <Text key={rule.id}>{rule.text}</Text>
      ))}
      <Button
        title="Wrong"
        onPress={() => {
          end();
        }}
      />
      <Button title="Confirm" onPress={onConfirm} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
