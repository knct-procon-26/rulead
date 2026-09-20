import { StyleSheet } from "react-native";
import { Button } from "react-native"

import EditScreenInfo from "@/components/EditScreenInfo";
import { Text, View } from "@/components/Themed";
import { useTranslation } from "react-i18next";

export default function TabOneScreen() {
  const { t, i18n } = useTranslation();
  const ChangeLanguage = (language : string) => {
    i18n.changeLanguage(language);
  }
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t('rulesTab.tabone')}
      </Text> 
      <View
        style={styles.separator}
        lightColor="#eee"
        darkColor="rgba(255,255,255,0.1)"
      />
      <EditScreenInfo path="app/(tabs)/index.tsx" />
      <View style={styles.buttonContainer}>
        <Button title="日本語" onPress={() => ChangeLanguage("ja")}/>
        <Button title="English" onPress={() => ChangeLanguage("en")}/>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#225",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  }
});