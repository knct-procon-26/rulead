import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/Colors";

type Props = {
  name: string;
  address: string;
};

export function ParkHeader({ name, address }: Props) {
  return (
    <View style={styles.container}>
      {address ? (
        <Text style={styles.address} numberOfLines={1}>
          {address}
        </Text>
      ) : null}
      <Text style={styles.name} numberOfLines={2}>
        {name || "名前のない公園"}
      </Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
  },
  address: {
    fontSize: 13,
    color: Colors.subText,
  },
  name: {
    marginTop: 2,
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.text,
    textAlign: "center",
  },
  line: {
    marginTop: 8,
    height: 2,
    backgroundColor: Colors.border,
  },
});
