import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/Colors";

// TODO: 公園日記
export default function DiaryTab() {
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
