import { useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialDesignIcons } from "@react-native-vector-icons/material-design-icons";
import Colors from "@/constants/Colors";
import { LANGUAGES, type LanguageCode } from "@/lib/language";

type Props = {
  value: LanguageCode;
  onChange: (code: LanguageCode) => void;
};

const OPTION_HEIGHT = 56;

export function LanguagePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const current = LANGUAGES.find((l) => l.code === value) ?? LANGUAGES[0];

  const choose = (code: LanguageCode) => {
    setOpen(false);
    onChange(code);
  };

  const scrollToSelected = () => {
    const index = LANGUAGES.findIndex((l) => l.code === value);
    if (index <= 0) return;
    scrollRef.current?.scrollTo({
      y: Math.max(0, (index - 1) * OPTION_HEIGHT),
      animated: false,
    });
  };

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Language: ${current.english}`}
      >
        <MaterialDesignIcons
          name="translate"
          size={20}
          color={Colors.subText}
        />
        <Text style={styles.buttonText} numberOfLines={1}>
          {current.label}
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
            <Text style={styles.sheetTitle}>Language</Text>
            <ScrollView
              ref={scrollRef}
              style={styles.list}
              onLayout={scrollToSelected}
            >
              {LANGUAGES.map((l) => {
                const selected = l.code === value;
                return (
                  <Pressable
                    key={l.code}
                    style={({ pressed }) => [
                      styles.option,
                      selected && styles.selectedOption,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => choose(l.code)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <View style={styles.optionTexts}>
                      <Text
                        style={[
                          styles.optionText,
                          selected && styles.selectedText,
                        ]}
                        numberOfLines={1}
                      >
                        {l.label}
                      </Text>
                      {l.label !== l.english ? (
                        <Text style={styles.optionSubText} numberOfLines={1}>
                          {l.english}
                        </Text>
                      ) : null}
                    </View>
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
            </ScrollView>
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
    gap: 8,
    minWidth: 160,
    maxWidth: 240,
    height: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#d5d5d5",
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  buttonText: {
    flexShrink: 1,
    flexGrow: 1,
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
    maxHeight: "100%",
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
  list: {
    flexGrow: 0,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    height: OPTION_HEIGHT,
    paddingHorizontal: 20,
  },
  selectedOption: {
    backgroundColor: Colors.surface,
  },
  optionTexts: {
    flex: 1,
  },
  optionText: {
    fontSize: 17,
    color: Colors.text,
  },
  optionSubText: {
    fontSize: 12,
    color: Colors.mutedText,
  },
  selectedText: {
    fontWeight: "bold",
    color: Colors.tint,
  },
});
