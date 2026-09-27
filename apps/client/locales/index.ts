import en from "./en";
import ja, { type Messages } from "./ja";
import vi from "./vi";
import zhCN from "./zh-CN";
import zhTW from "./zh-TW";

export type { Messages };

export const UI_LOCALES = {
  ja,
  en,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  vi,
} as const satisfies Readonly<Record<string, Messages>>;

export type UiLocale = keyof typeof UI_LOCALES;

export const FALLBACK_UI_LOCALE: UiLocale = "en";
