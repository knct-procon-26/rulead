import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import Colors from "@/constants/Colors";
import type { IconType } from "./types";

type GlyphName = ComponentProps<typeof MaterialDesignIcons>["name"];

type Props = {
  name: string;
  iconType: IconType;
  size?: number;
};

export function RuleIcon({ name, iconType, size = 56 }: Props) {
  const glyph = name as GlyphName;
  const box = { width: size, height: size };

  if (iconType === "prohibition") {
    const ring = Math.max(3, Math.round(size * 0.09));
    return (
      <View style={[styles.center, box]}>
        <MaterialDesignIcons
          name={glyph}
          size={size * 0.56}
          color={Colors.text}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: size / 2,
              borderWidth: ring,
              borderColor: Colors.prohibition,
            },
          ]}
        />
        <View
          style={{
            position: "absolute",
            top: ring / 2,
            left: (size - ring) / 2,
            width: ring,
            height: size - ring,
            backgroundColor: Colors.prohibition,
            transform: [{ rotate: "-45deg" }],
          }}
        />
      </View>
    );
  }

  if (iconType === "caution") {
    return (
      <View style={box}>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <MaterialDesignIcons
            name="triangle"
            size={size}
            color={Colors.caution}
          />
        </View>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <MaterialDesignIcons
            name="triangle-outline"
            size={size}
            color={Colors.text}
          />
        </View>
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.center,
            { paddingTop: size * 0.2 },
          ]}
        >
          <MaterialDesignIcons
            name={glyph}
            size={size * 0.36}
            color={Colors.text}
          />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.center,
        box,
        { borderRadius: size * 0.16, backgroundColor: Colors.information },
      ]}
    >
      <MaterialDesignIcons name={glyph} size={size * 0.64} color="#ffffff" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
});
