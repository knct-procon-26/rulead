//TODO: アイコンを表示するコンポーネントを作成する。
import { View, Text, StyleSheet, Image } from "react-native";

export function Icon({ name }: { name: string }) {
  return (
    <>
      {name === "nodata" ? (
        <Image
          style={styles.icon}
          source={require("../assets/images/icon.png")}
        />
      ) : (
        <Text style={styles.icon}>TODO</Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 32,
    height: 32,
  },
});
