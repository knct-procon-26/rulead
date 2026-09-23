//TODO: アイコンを表示するコンポーネントを作成する。
import { StyleSheet, Image } from "react-native";
import { Text, View } from "@/components/Themed";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";

export function Icon({
  name,
  iconType,
}: {
  name: string;
  iconType: "prohibition" | "caution" | "information";
}) {
  return (
    <>
      {name === "nodata" ? (
        <Image
          style={styles.icon}
          source={require("../assets/images/icon.png")}
        />
      ) : (
        <>
          <MaterialDesignIcons name={name as any} color="#fff" size={40} />
          <Text>{iconType}</Text>
        </>
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
