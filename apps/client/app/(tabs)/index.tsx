import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/Colors";

// TODO: 今いる公園のルールを表示する。
// 公園のルールを取得する API ができたら、components/rules/ParkRules に
// park と rules を渡すだけで確認画面と同じ見た目で表示できる。
export default function RuleTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>準備中です</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  text: {
    fontSize: 16,
    color: Colors.subText,
  },
});
