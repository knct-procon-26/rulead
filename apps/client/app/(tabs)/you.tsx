import { StyleSheet } from "react-native";

import EditScreenInfo from "@/components/EditScreenInfo";
import { Text, View } from "@/components/Themed";
import ExampleScreen from "@/components/ExampleScreen";

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
