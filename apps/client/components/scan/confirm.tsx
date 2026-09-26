import { Button, ScrollView, StyleSheet } from "react-native";
import { Text, View } from "@/components/Themed";
import { useRef, useState } from "react";
import { Icon } from "../Icon";
import ConfirmUI from "./comfirmUI";

type Rule = {
  id: string;
  text: string;
  iconId: number;
  iconName: string;
  iconType: "prohibition" | "caution" | "information";
  keywords: { id: number; label: string }[];
};
type props = {
  onConfirm: () => void;
  rules: Rule[];
  end: (message?: string) => Promise<void>;
};

type rule = {
  icon: any;
  typeIcon: any;
  title: string;
  keyword: string;
};

const ruleDisplay: rule[] = [
  {
    icon: require("../../assets/images/pictograms/icon_ball.png"),
    typeIcon: require("../../assets/images/pictograms/icon_prohibition.png"),
    title: "ボール遊びは禁止です",
    keyword: "soccer, baseball,",
    // export default function Confirm({ onConfirm, rules, end }: props) {
    //   console.log(rules);
    //   return (
    //     <ScrollView style={styles.container}>
    //       {rules.map((rule) => (
    //         <View style={styles.xStack} key={rule.id}>
    //           <Icon name={rule.iconName} iconType={rule.iconType}></Icon>
    //           <Text>{rule.text}</Text>
    //           <Text>{rule.keywords.map((i) => i.label).join(", ")}</Text>
    //         </View>
    //       ))}
    //       <Button
    //         title="Wrong"
    //         onPress={() => {
    //           end();
    //         }}
    //       />
    //       <Button
    //         title="Confirm"
    //         onPress={onConfirm}
    //         disabled={rules.length === 0}
    //       />
    //     </ScrollView>
    //   );
    // }

    // const styles = StyleSheet.create({
    //   container: {
    //     flex: 1,
    //     // justifyContent: "center",
    //     // alignItems: "center",
    //   },

    //   xStack: {
    //     flexDirection: "row",
    //     flexWrap: "wrap",
  },
  {
    icon: require("../../assets/images/pictograms/icon_fire.png"),
    typeIcon: require("../../assets/images/pictograms/icon_prohibition.png"),
    title: "焚火をしないでください",
    keyword: "fire",
  },
  {
    icon: require("../../assets/images/pictograms/icon_skateboard.png"),
    typeIcon: require("../../assets/images/pictograms/icon_prohibition.png"),
    title: "スケートボードは禁止です",
    keyword: "skateboard",
  },
  {
    icon: require("../../assets/images/pictograms/icon_bicycle.png"),
    typeIcon: require("../../assets/images/pictograms/icon_caution.png"),
    title: "自転車に気を付けてください",
    keyword: "bicycle",
  },
];

export default function Confirm({ onConfirm, rules }: props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("日本語");
  const [items, setItems] = useState([
    {
      label: "日本語",
      value: "japanese",
    },
    {
      label: "English",
      value: "english",
    },
  ]);

  return (
    <ConfirmUI
      rules={ruleDisplay}
      open={open}
      value={value}
      items={items}
      setOpen={setOpen}
      setValue={setValue}
      setItems={setItems}
      onConfirm={onConfirm}
    />
  );
}
