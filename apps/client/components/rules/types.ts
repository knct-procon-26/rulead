export type IconType = "prohibition" | "caution" | "information";

export type ScannedRule = {
  id: string;
  text: string;
  iconId: number;
  iconName: string;
  iconType: IconType;
  keywords: { id: number; label: string }[];
};

export type DisplayRule = {
  id: string;
  text: string;
  iconName: string;
  iconType: IconType;
  keywords?: string[];
};

export function toIconType(value: string): IconType {
  return value === "prohibition" || value === "caution" ? value : "information";
}

export function scannedToDisplay(rule: ScannedRule): DisplayRule {
  return {
    id: rule.id,
    text: rule.text,
    iconName: rule.iconName,
    iconType: rule.iconType,
    keywords: rule.keywords.map((k) => k.label),
  };
}
