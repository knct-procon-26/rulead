import { TouchableOpacity, StyleSheet, Image, ScrollView,} from "react-native";
import { Text, View } from "@/components/Themed";
import DropDownPicker from "react-native-dropdown-picker";

type rule = {
  icon: any;
  typeIcon: any;
  title: string;
  keyword: string;
};

type confirmUIprops = {
  rules: rule[];
  open: boolean;
  value: string;
  items: {
  	label: string;
  	value: string;
  }[];
  setOpen: any;
  setValue: any;
  setItems: any;
  onConfirm: () => void;
};


export default function ConfirmUI({
	rules,
  open,
  value,
  items,
  setOpen,
  setValue,
  setItems,
  onConfirm,
}: confirmUIprops) {
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.parkAddress}>
          日本 XX県 YY市 ZZ町 000-0000
        </Text>
        <Text style={styles.parkName}>
          ほげふが公園
        </Text>
        <View style={styles.parkLine} />
      </View>
      <View style={styles.languageContainer}>
        <View style={styles.languagePickerWrapper}>
          <DropDownPicker
            style={styles.buttonLang}
            open={open}
            value={value}
            items={items}
            setOpen={setOpen}
            setValue={setValue}
            setItems={setItems}
            placeholder="日本語"
            textStyle={styles.languageText}
            dropDownContainerStyle={styles.dropDownContainer}
          />
          <Image
            source={require("../../assets/images/pictograms/icon_translation.png")}
            style={styles.languageIcon}
          />
        </View>
      </View>
      <ScrollView
        style={styles.ruleList}
        contentContainerStyle={styles.ruleListContent}
        showsVerticalScrollIndicator={true}//スクロールバーを表示するかどうか
      >
        {rules.map((rule, index) => (
          <View
            key={index}
            style={styles.ruleTextContainer}
          >
            <View style={styles.iconContainer}>
              <Image
                source={rule.icon}
                style={styles.ruleIcon}
                resizeMode="contain"
              />
              <Image
                source={rule.typeIcon}
                style={styles.typeIcon}
                resizeMode="contain"
              />
            </View>
            <View style={styles.ruleText}>
              <Text style={styles.ruleTitle}>
                {rule.title}
              </Text>
              <Text style={styles.keyword}>
                Keyword: {rule.keyword}
              </Text>
            </View>
          </View>
        ))}
        <View style={styles.confirmContainer}>
          <TouchableOpacity
            style={styles.buttonWrong}
            onPress={() => {}}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              ✖ 間違っています
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonConfirm}
            onPress={onConfirm}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              ✔ コレクションする
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    width: "100%",
    paddingHorizontal: 48,
    paddingTop: 18,
  },
  parkAddress: {
    fontSize: 14,
    color: "#616161",
    textAlign: "left",
  },
  parkName: {
    fontSize: 34,
    color: "#111111",
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 2,
  },
  parkLine: {
    height: 2,
    backgroundColor: "#dddddd",
    width: "100%",
    marginTop: 8,
  },
  languageContainer: {
    width: "100%",
    paddingRight: 48,
    alignItems: "flex-end",
    marginTop: 6,
    marginBottom: 4,
    zIndex: 10,
  },
  languagePickerWrapper: {
    width: 200,
    height: 46,
    position: "relative",
    zIndex: 10,
  },
  languageIcon: {
    position: "absolute",
    left: 12,
    top: 11,
    width: 22,
    height: 22,
    zIndex: 30,
  },
  buttonLang: {
    width: 200,
    height: 46,
    borderWidth: 1,
    borderColor: "#d5d5d5",
    borderRadius: 12,
    paddingLeft: 40,
    paddingRight: 10,
    zIndex: 1,
  },
  languageText: {
    fontSize: 16,
  },
  dropDownContainer: {
    width: 200,
    borderColor: "#d5d5d5",
    borderRadius: 12,
    alignSelf: "flex-end",
    zIndex: 20,
    elevation: 5,
  },
  ruleList: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 48,
    zIndex: 1,
  },
  ruleListContent: {
    paddingBottom: 20,
  },
  ruleTextContainer: {
    width: "100%",
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#dddddd",
    paddingVertical: 8,
  },
  iconContainer: {
    width: 62,
    height: 62,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  ruleIcon: {
    position: "absolute",
    width: 58,
    height: 58,
  },
  typeIcon: {
    position: "absolute",
    width: 58,
    height: 58,
  },
  ruleText: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 4,
  },
  ruleTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111111",
    marginBottom: 4,
  },
  keyword: {
    fontSize: 14,
    color: "#777777",
  },
  confirmContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 20,
    gap: 30,
  },
  buttonWrong: {
    flex: 1,
    height: 40,
    borderRadius: 22,
    backgroundColor: "#c90000",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonConfirm: {
    flex: 1,
    height: 40,
    borderRadius: 22,
    backgroundColor: "#009900",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
});