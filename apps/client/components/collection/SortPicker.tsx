import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import Colors from "@/constants/Colors";

export type SortOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  value: T;
  options: readonly SortOption<T>[];
  onChange: (value: T) => void;
};

export function SortPicker<T extends string>({
  value,
  options,
  onChange,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? options[0];

  const choose = (next: T) => {
    setOpen(false);
    onChange(next);
  };

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`並べ替え: ${current?.label ?? ""}`}
      >
        <MaterialDesignIcons name="sort" size={20} color={Colors.subText} />
        <Text style={styles.buttonText} numberOfLines={1}>
          {current?.label ?? ""}
        </Text>
        <MaterialDesignIcons
          name="chevron-down"
          size={20}
          color={Colors.mutedText}
        />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
            accessibilityLabel="Close"
          />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>並べ替え</Text>
            {options.map((o) => {
              const selected = o.value === value;
              return (
                <Pressable
                  key={o.value}
                  style={({ pressed }) => [
                    styles.option,
                    selected && styles.selectedOption,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => choose(o.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[styles.optionText, selected && styles.selectedText]}
                    numberOfLines={1}
                  >
                    {o.label}
                  </Text>
                  {selected ? (
                    <MaterialDesignIcons
                      name="check"
                      size={20}
                      color={Colors.tint}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
    height: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#d5d5d5",
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  buttonText: {
    flexShrink: 1,
    fontSize: 16,
    color: Colors.text,
  },
  pressed: {
    opacity: 0.6,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  sheet: {
    borderRadius: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: Colors.background,
    overflow: "hidden",
  },
  sheetTitle: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.subText,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    height: 56,
    paddingHorizontal: 20,
  },
  selectedOption: {
    backgroundColor: Colors.surface,
  },
  optionText: {
    flex: 1,
    fontSize: 17,
    color: Colors.text,
  },
  selectedText: {
    fontWeight: "bold",
    color: Colors.tint,
  },
});
