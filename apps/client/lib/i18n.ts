import { getLanguage, useLanguage, type LanguageCode } from "@/lib/language";
import {
  FALLBACK_UI_LOCALE,
  UI_LOCALES,
  type Messages,
  type UiLocale,
} from "@/locales";

export type { Messages, UiLocale };

export function uiLocaleOf(language: LanguageCode): UiLocale {
  return Object.prototype.hasOwnProperty.call(UI_LOCALES, language)
    ? (language as UiLocale)
    : FALLBACK_UI_LOCALE;
}

export function getUiLocale(): UiLocale {
  return uiLocaleOf(getLanguage());
}

export function getT(): Messages {
  return UI_LOCALES[getUiLocale()];
}

export function useT(): Messages {
  const [language] = useLanguage();
  return UI_LOCALES[uiLocaleOf(language)];
}

export function useUiLocale(): UiLocale {
  const [language] = useLanguage();
  return uiLocaleOf(language);
}
