import { useState } from "react";
import ConfirmUI from "./comfirmUI";

type props = {
  onConfirm: () => void;
  rules: { id: string; text: string }[];
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