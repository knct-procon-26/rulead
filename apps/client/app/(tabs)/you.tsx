import ExampleScreen from "@/components/ExampleScreen";
import { StyleSheet, View, Text } from "react-native";

export default function YouTab() {
  return (
    <View style={styles.container}>
      <ExampleScreen></ExampleScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
