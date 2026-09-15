import { Button, StyleSheet } from "react-native";
import { Text, View } from "@/components/Themed";

type props = {
  onConfirm: () => void;
  rules: { id: string; text: string }[];
};

export default function Confirm({ onConfirm, rules }: props) {
  return (
    <View style={styles.container}>
      {rules.map((rule) => (
        <Text key={rule.id}>{rule.text}</Text>
      ))}
      {/* // TODO: 間違っていた場合に最初からやり直させる */}
      <Button title="Wrong" onPress={() => {}} />
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
